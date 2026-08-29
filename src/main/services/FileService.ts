import { BrowserWindow, dialog } from "electron";
import fs from "node:fs";
import {
  createEmptyDocument,
  decryptJSON,
  encryptJSON,
  type AhbDocument,
} from "../crypto";
import { initData } from "../data";
import { logger } from "./Logger";
import { FileCache } from "./FileCache";
import { dict, getLanguage } from "../i18n";
import { logMemoryUsage } from "../utils/memory";
import { createSaveScheduler, type SaveScheduler } from "../utils/saveScheduler";

/**
 * The dictionary is read per call, not once at module load: the language menu
 * rebuilds the UI without a restart, and these dialogs have to follow it.
 */
function tr(key: string, params?: Record<string, string>): string {
  const value = (dict[getLanguage()] as Record<string, string>)[key] ?? key;
  if (!params) return value;
  return Object.entries(params).reduce(
    (out, [name, replacement]) => out.split(`{${name}}`).join(replacement),
    value
  );
}

export class FileService {
  private currentFilePath: string | null = null;
  private currentDoc: AhbDocument = createEmptyDocument();
  private isDirty = false;
  private cache = new FileCache();
  private dataChangedCallbacks: Array<() => void> = [];
  private subscriberWindows = new Set<BrowserWindow>();
  private saves: SaveScheduler = createSaveScheduler(() => this.saveNow());
  /** Last write failure already reported, so one bad disk is one dialog. */
  private lastSaveError: string | null = null;

  constructor(private win: BrowserWindow | null = null) {
    if (win) this.subscriberWindows.add(win);
    // Ensure data container exists
    if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
      (this.currentDoc as AhbDocument).data = initData();
    }
  }

  /**
   * Register callback for when document data changes
   */
  onDataChanged(callback: () => void): void {
    this.dataChangedCallbacks.push(callback);
  }

  /**
   * Trigger all data changed callbacks
   */
  private triggerDataChanged(): void {
    this.dataChangedCallbacks.forEach((cb) => cb());
  }

  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  getCurrentDoc(): AhbDocument {
    return this.currentDoc;
  }

  getIsDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Marking the document dirty is what schedules its save: there is no manual
   * Save, so every mutation persists on its own a moment later.
   */
  setDirty(dirty: boolean): void {
    this.isDirty = dirty;
    if (dirty) this.saves.schedule();
  }

  /** Write a pending save immediately — before closing or switching files. */
  flushPendingSave(): void {
    this.saves.flush();
  }

  private saveNow(): void {
    if (!this.currentFilePath) return;
    try {
      this.writeCurrentTo(this.currentFilePath);
      this.isDirty = false;
      this.lastSaveError = null;
    } catch (err) {
      // Nothing prompts the user any more, so a file that cannot be written has
      // to say so itself. The document stays dirty and the next change retries.
      const message = (err as Error).message;
      logger.error("Autosave failed", "FileService", err);
      if (this.lastSaveError !== message) {
        this.lastSaveError = message;
        dialog.showErrorBox(
          tr("cannot_save_file"),
          `${tr("cannot_save_file_detail", {
            path: this.currentFilePath ?? "",
          })}\n\n${message}`
        );
      }
    }
    this.broadcastFileInfo();
  }

  getFileInfo() {
    return {
      path: this.currentFilePath,
      isDirty: this.isDirty,
    };
  }

  /**
   * Subscribe an additional window (e.g. a child history window) to
   * notify() broadcasts. Dialogs keep using the primary window.
   */
  attachWindow(win: BrowserWindow): void {
    this.subscriberWindows.add(win);
  }

  detachWindow(win: BrowserWindow): void {
    this.subscriberWindows.delete(win);
  }

  private notify(channel: string, ...args: unknown[]) {
    for (const win of this.subscriberWindows) {
      if (win.isDestroyed()) {
        this.subscriberWindows.delete(win);
        continue;
      }
      win.webContents.send(channel, ...args);
    }
  }

  broadcastFileInfo() {
    this.notify("app:file-info", {
      path: this.currentFilePath,
      isDirty: this.isDirty,
    });
  }

  private writeCurrentTo(pathToWrite: string) {
    this.currentDoc.meta.updatedAt = new Date().toISOString();

    logMemoryUsage("Before encryption");
    const enc = encryptJSON(this.currentDoc);
    logMemoryUsage("After encryption");

    // Write to temp file first, then rename (atomic operation)
    const tempPath = `${pathToWrite}.tmp`;
    try {
      fs.writeFileSync(tempPath, enc);
      fs.renameSync(tempPath, pathToWrite);

      // Update cache
      this.cache.set(pathToWrite, this.currentDoc);

      logger.info("File saved successfully", "FileService", {
        path: pathToWrite,
        sizeKB: Math.round(enc.length / 1024),
      });
    } catch (err) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw err;
    }
  }

  async handleNewFile(): Promise<void> {
    const res = await dialog.showSaveDialog(this.win!, {
      defaultPath: "untitled.ahbs",
      filters: [{ name: tr("file_type_ahbs"), extensions: ["ahbs"] }],
    });
    if (res.canceled || !res.filePath) return;

    this.currentFilePath = res.filePath.endsWith(".ahbs")
      ? res.filePath
      : `${res.filePath}.ahbs`;
    this.currentDoc = createEmptyDocument();

    // Backfill data container if missing
    if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
      (this.currentDoc as AhbDocument).data = initData();
    }

    this.writeCurrentTo(this.currentFilePath);
    this.notify("app:document-changed");
    this.isDirty = false;
    this.broadcastFileInfo();
    this.triggerDataChanged();
  }

  async handleOpenFile(): Promise<void> {
    const res = await dialog.showOpenDialog(this.win!, {
      properties: ["openFile"],
      filters: [{ name: tr("file_type_ahbs"), extensions: ["ahbs"] }],
    });
    if (res.canceled || res.filePaths.length === 0) return;

    const filePath = res.filePaths[0];
    if (!filePath) return;

    try {
      // Check cache first
      const cached = this.cache.get(filePath);
      if (cached) {
        this.currentDoc = cached;
        logger.info("Loaded document from cache", "FileService", { filePath });
      } else {
        // Check file size before loading
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 100) {
          logger.warn("Large file detected", "FileService", {
            filePath,
            sizeMB: sizeMB.toFixed(2),
          });
        }

        const buf = fs.readFileSync(filePath);
        const parsed = decryptJSON(buf) as AhbDocument;
        this.currentDoc = parsed;

        // Cache the parsed document
        this.cache.set(filePath, this.currentDoc);
      }

      // Backfill data container if missing
      if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
        (this.currentDoc as AhbDocument).data = initData();
      }

      this.currentFilePath = filePath;
      this.notify("app:document-changed");
      this.isDirty = false;
      this.broadcastFileInfo();
      this.triggerDataChanged();
    } catch (err) {
      logger.error("Failed to open/decrypt file", "FileService", err);
      await dialog.showMessageBox(this.win!, {
        type: "error",
        title: tr("cannot_open_file"),
        message: tr("cannot_open_file_detail"),
        detail: `${(err as Error).message}`,
      });
    }
  }

  async handleSaveFileAs(): Promise<void> {
    const res = await dialog.showSaveDialog(this.win!, {
      defaultPath: this.currentFilePath ?? "untitled.ahbs",
      filters: [{ name: tr("file_type_ahbs"), extensions: ["ahbs"] }],
    });
    if (res.canceled || !res.filePath) return;

    this.currentFilePath = res.filePath.endsWith(".ahbs")
      ? res.filePath
      : `${res.filePath}.ahbs`;
    this.writeCurrentTo(this.currentFilePath);
    this.notify("app:document-changed");
    this.isDirty = false;
    this.broadcastFileInfo();
  }

  async closeFile(): Promise<void> {
    if (!this.currentFilePath) return; // nothing to close
    this.saves.cancel();

    // Don't clear cache - keep for potential reopen

    // Reset current document and state
    this.currentFilePath = null;
    this.currentDoc = createEmptyDocument();
    if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
      (this.currentDoc as AhbDocument).data = initData();
    }
    this.isDirty = false;
    this.notify("app:document-closed");
    this.broadcastFileInfo();
  }

  // Each flow leaves the current document behind, so anything still waiting on
  // the timer is written first.
  async newFileFlow(): Promise<void> {
    this.flushPendingSave();
    await this.handleNewFile();
  }

  async openFileFlow(): Promise<void> {
    this.flushPendingSave();
    await this.handleOpenFile();
  }

  async closeFileFlow(): Promise<void> {
    if (!this.currentFilePath) return; // nothing to close
    this.flushPendingSave();
    await this.closeFile();
  }

  async openFileByPath(filePath: string): Promise<void> {
    try {
      const cached = this.cache.get(filePath);
      const doc = cached ?? (decryptJSON(fs.readFileSync(filePath)) as AhbDocument);
      if (!cached) this.cache.set(filePath, doc);
      if (!doc.data || typeof doc.data !== "object") {
        (doc as AhbDocument).data = initData();
      }
      this.currentDoc = doc;
      this.currentFilePath = filePath;
      this.isDirty = false;
      this.notify("app:document-changed");
      this.broadcastFileInfo();
      this.triggerDataChanged();
    } catch (err) {
      logger.error("Failed to open file by path", "FileService", err);
      await dialog.showMessageBox(this.win!, {
        type: "error",
        title: tr("cannot_open_file"),
        message: tr("cannot_open_file_detail"),
        detail: `${(err as Error).message}`,
      });
    }
  }

  notifyDataChanged(event: {
    kind: string;
    action: string;
    id: number | string;
  }): void {
    this.notify("data:changed", event);
  }
}
