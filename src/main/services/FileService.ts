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
import { nowIso } from "../../utils/date";
import { FileCache } from "./FileCache";
import { logMemoryUsage } from "../utils/memory";

export class FileService {
  private currentFilePath: string | null = null;
  private currentDoc: AhbDocument = createEmptyDocument();
  private isDirty = false;
  private cache = new FileCache();
  private dataChangedCallbacks: Array<() => void> = [];

  constructor() {
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

  setDirty(dirty: boolean): void {
    this.isDirty = dirty;
  }

  getFileInfo() {
    return {
      path: this.currentFilePath,
      isDirty: this.isDirty,
    };
  }

  private notifyAll(channel: string, ...args: unknown[]) {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send(channel, ...args)
    );
  }

  broadcastFileInfo() {
    this.notifyAll("app:file-info", {
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
    const res = await dialog.showSaveDialog({
      defaultPath: "untitled.ahbs",
      filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
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
    this.notifyAll("app:document-changed");
    this.isDirty = false;
    this.broadcastFileInfo();
    this.triggerDataChanged();
  }

  async handleOpenFile(): Promise<void> {
    const res = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
    });
    if (res.canceled || res.filePaths.length === 0) return;

    const filePath = res.filePaths[0];
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
      this.notifyAll("app:document-changed");
      this.isDirty = false;
      this.broadcastFileInfo();
      this.triggerDataChanged();
    } catch (err) {
      logger.error("Failed to open/decrypt file", "FileService", err);
      await dialog.showMessageBox({
        type: "error",
        title: "Cannot open file",
        message:
          "This file could not be opened. It may be corrupted, not an AHB Sales file, or encrypted with a different key.",
        detail: `${(err as Error).message}`,
      });
    }
  }

  async handleSaveFile(): Promise<void> {
    if (!this.currentFilePath) {
      await this.handleSaveFileAs();
      return;
    }
    this.writeCurrentTo(this.currentFilePath);
    this.isDirty = false;
    this.broadcastFileInfo();
  }

  async handleSaveFileAs(): Promise<void> {
    const res = await dialog.showSaveDialog({
      defaultPath: this.currentFilePath ?? "untitled.ahbs",
      filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
    });
    if (res.canceled || !res.filePath) return;

    this.currentFilePath = res.filePath.endsWith(".ahbs")
      ? res.filePath
      : `${res.filePath}.ahbs`;
    this.writeCurrentTo(this.currentFilePath);
    this.notifyAll("app:document-changed");
    this.isDirty = false;
    this.broadcastFileInfo();
  }

  async closeFile(): Promise<void> {
    if (!this.currentFilePath) return; // nothing to close

    // Don't clear cache - keep for potential reopen

    // Reset current document and state
    this.currentFilePath = null;
    this.currentDoc = createEmptyDocument();
    if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
      (this.currentDoc as AhbDocument).data = initData();
    }
    this.isDirty = false;
    this.notifyAll("app:document-closed");
    this.broadcastFileInfo();
  }

  async askToSaveChanges(): Promise<"save" | "dont" | "cancel"> {
    if (!this.isDirty) return "dont";
    const result = await dialog.showMessageBox({
      type: "question",
      buttons: ["Save", "Don't Save", "Cancel"],
      defaultId: 0,
      cancelId: 2,
      title: "Unsaved changes",
      message: "You have unsaved changes. Do you want to save them?",
    });
    return result.response === 0
      ? "save"
      : result.response === 1
        ? "dont"
        : "cancel";
  }

  async saveCurrentPossiblyAs(): Promise<boolean> {
    if (this.currentFilePath) {
      await this.handleSaveFile();
      return true;
    }
    await this.handleSaveFileAs();
    return Boolean(this.currentFilePath);
  }

  async newFileFlow(): Promise<void> {
    if (this.isDirty) {
      const decision = await this.askToSaveChanges();
      if (decision === "cancel") return;
      if (decision === "save") {
        const ok = await this.saveCurrentPossiblyAs();
        if (!ok) return; // user canceled save-as
      }
    }
    await this.handleNewFile();
  }

  async openFileFlow(): Promise<void> {
    if (this.isDirty) {
      const decision = await this.askToSaveChanges();
      if (decision === "cancel") return;
      if (decision === "save") {
        const ok = await this.saveCurrentPossiblyAs();
        if (!ok) return;
      }
    }
    await this.handleOpenFile();
  }

  async closeFileFlow(): Promise<void> {
    if (!this.currentFilePath) return; // nothing to close
    if (this.isDirty) {
      const decision = await this.askToSaveChanges();
      if (decision === "cancel") return;
      if (decision === "save") {
        const ok = await this.saveCurrentPossiblyAs();
        if (!ok) return;
      }
    }
    await this.closeFile();
  }

  notifyDataChanged(event: {
    kind: string;
    action: string;
    id: number | string;
  }): void {
    this.notifyAll("data:changed", event);
  }
}
