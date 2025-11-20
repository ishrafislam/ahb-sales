import { app, autoUpdater, BrowserWindow } from "electron";
import { updateElectronApp } from "update-electron-app";
import { logger } from "./Logger";

export class UpdateService {
  private notifyAll(channel: string, ...args: unknown[]) {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send(channel, ...args)
    );
  }

  initAutoUpdates(): void {
    const enabled = app.isPackaged || process.env.FORCE_UPDATER === "1";
    if (!enabled) return;

    try {
      updateElectronApp({
        repo: "ishrafislam/ahb-sales",
        updateInterval: "1 hour",
        logger: {
          log: (...args: unknown[]) => logger.info(String(args), "updater"),
          info: (...args: unknown[]) => logger.info(String(args), "updater"),
          warn: (...args: unknown[]) => logger.warn(String(args), "updater"),
          error: (...args: unknown[]) => logger.error(String(args), "updater"),
        },
      });
    } catch (e) {
      logger.error("update-electron-app init failed", "UpdateService", e);
    }

    // Forward updater events to renderer for toasts
    autoUpdater.on("checking-for-update", () =>
      this.notifyAll("update:checking")
    );
    autoUpdater.on("update-available", () =>
      this.notifyAll("update:available")
    );
    autoUpdater.on("update-not-available", () =>
      this.notifyAll("update:not-available")
    );
    autoUpdater.on("error", (err) =>
      this.notifyAll("update:error", String(err))
    );
    autoUpdater.on("update-downloaded", () =>
      this.notifyAll("update:downloaded")
    );
  }

  async checkForUpdates(): Promise<boolean> {
    try {
      await autoUpdater.checkForUpdates();
      return true;
    } catch (e) {
      logger.error("manual checkForUpdates failed", "UpdateService", e);
      throw e;
    }
  }

  async restartAndInstall(): Promise<boolean> {
    try {
      autoUpdater.quitAndInstall();
      return true;
    } catch (e) {
      logger.error("quitAndInstall failed", "UpdateService", e);
      throw e;
    }
  }
}
