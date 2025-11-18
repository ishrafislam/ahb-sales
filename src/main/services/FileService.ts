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

export class FileService {
  private currentFilePath: string | null = null;
  private currentDoc: AhbDocument = createEmptyDocument();
  private isDirty = false;

  constructor() {
    // Ensure data container exists
    if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
      (this.currentDoc as AhbDocument).data = initData();
    }
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
    const enc = encryptJSON(this.currentDoc);
    fs.writeFileSync(pathToWrite, enc);
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
  }

  async handleOpenFile(): Promise<void> {
    const res = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "AHB Sales Files", extensions: ["ahbs"] }],
    });
    if (res.canceled || res.filePaths.length === 0) return;

    const filePath = res.filePaths[0];
    try {
      const buf = fs.readFileSync(filePath);
      const parsed = decryptJSON(buf) as AhbDocument;
      this.currentDoc = parsed;

      // Backfill data container if missing
      if (!this.currentDoc.data || typeof this.currentDoc.data !== "object") {
        (this.currentDoc as AhbDocument).data = initData();
      }

      this.currentFilePath = filePath;
      this.notifyAll("app:document-changed");
      this.isDirty = false;
      this.broadcastFileInfo();
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
