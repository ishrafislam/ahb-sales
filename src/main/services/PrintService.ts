import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./Logger";
import {
  composePrintHtml,
  normalizeMargins,
  type PrintDocument,
  type PrintJob,
  type PrintMargins,
} from "../../print/document";
import type { SettingsService } from "./SettingsService";

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Holds print jobs for the preview window and drives the actual printing.
 *
 * Documents are kept here rather than passed through the window URL: only the
 * job id travels in the hash, the same way the payment windows carry an
 * invoice id.
 */
export class PrintService {
  private jobs = new Map<string, PrintJob>();

  constructor(private settingsService: SettingsService) {}

  createJob(doc: PrintDocument): string {
    const id = genId();
    const margins = normalizeMargins(
      doc.margins ?? this.settingsService.getPrintMargins()
    );
    this.jobs.set(id, { doc, margins });
    return id;
  }

  getJob(id: string): PrintJob | null {
    return this.jobs.get(id) ?? null;
  }

  setMargins(id: string, margins: PrintMargins): PrintMargins | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    job.margins = normalizeMargins(margins);
    return job.margins;
  }

  disposeJob(id: string): void {
    this.jobs.delete(id);
  }

  /**
   * Render the document in a hidden window and hand it to the OS print
   * dialog. Margins are already baked into the HTML as padding, so the
   * printer is asked for none of its own.
   */
  async print(
    id: string,
    margins: PrintMargins
  ): Promise<{ success: boolean; reason?: string }> {
    const job = this.jobs.get(id);
    if (!job) return { success: false, reason: "Print job not found" };

    const applied = normalizeMargins(margins);
    job.margins = applied;
    // Remember them for the next document
    this.settingsService.setPrintMargins(applied);

    const html = composePrintHtml(job.doc, applied);
    const file = path.join(app.getPath("temp"), `ahb-print-${id}.html`);

    let win: BrowserWindow | null = null;
    try {
      fs.writeFileSync(file, html, "utf-8");
      win = new BrowserWindow({ show: false });
      await win.loadFile(file);
    } catch (e) {
      logger.error("Failed to prepare print document", "PrintService", e);
      if (win && !win.isDestroyed()) win.destroy();
      this.cleanup(file);
      return {
        success: false,
        reason: e instanceof Error ? e.message : String(e),
      };
    }

    const target = win;
    return new Promise((resolve) => {
      target.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: "none" },
        },
        (success, reason) => {
          if (!target.isDestroyed()) target.destroy();
          this.cleanup(file);
          resolve({ success, reason: success ? undefined : reason });
        }
      );
    });
  }

  private cleanup(file: string): void {
    try {
      fs.unlinkSync(file);
    } catch {
      // Already gone, or the OS is still holding it — nothing to do
    }
  }
}
