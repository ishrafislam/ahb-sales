import { app, autoUpdater, BrowserWindow } from "electron";
import { updateElectronApp } from "update-electron-app";

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
          log: (...args: unknown[]) => console.log("[updater]", ...args),
          info: (...args: unknown[]) => console.log("[updater]", ...args),
          warn: (...args: unknown[]) => console.warn("[updater]", ...args),
          error: (...args: unknown[]) => console.error("[updater]", ...args),
        },
      });
    } catch (e) {
      console.error("update-electron-app init failed", e);
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
      console.error("manual checkForUpdates failed", e);
      throw e;
    }
  }

  async restartAndInstall(): Promise<boolean> {
    try {
      autoUpdater.quitAndInstall();
      return true;
    } catch (e) {
      console.error("quitAndInstall failed", e);
      throw e;
    }
  }
}
