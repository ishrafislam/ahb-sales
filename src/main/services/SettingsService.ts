import { app, nativeTheme, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./Logger";

export type ThemeSource = "system" | "light" | "dark";

export type AppSettings = {
  language?: "bn" | "en";
  themeSource?: ThemeSource;
};

export class SettingsService {
  private getSettingsPath(): string {
    const dir = app.getPath("userData");
    return path.join(dir, "settings.json");
  }

  loadSettings(): AppSettings {
    try {
      const p = this.getSettingsPath();
      if (!fs.existsSync(p))
        return { themeSource: "system" };
      const raw = fs.readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        language: parsed.language,
        themeSource: parsed.themeSource ?? "system",
      };
    } catch {
      return { themeSource: "system" };
    }
  }

  saveSettings(next: Partial<AppSettings>): void {
    try {
      const p = this.getSettingsPath();
      const existing = this.loadSettings();
      const merged: AppSettings = {
        ...existing,
        ...next,
      };
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf-8");
    } catch (e) {
      logger.error("Failed to save settings", "SettingsService", e);
    }
  }

  private effectiveTheme(source: ThemeSource): "light" | "dark" {
    if (source === "system")
      return nativeTheme.shouldUseDarkColors ? "dark" : "light";
    return source;
  }

  getTheme(): { source: ThemeSource; effective: "light" | "dark" } {
    const s = this.loadSettings();
    const source = s.themeSource ?? "system";
    return { source, effective: this.effectiveTheme(source) };
  }

  setTheme(source: ThemeSource): {
    source: ThemeSource;
    effective: "light" | "dark";
  } {
    try {
      nativeTheme.themeSource = source;
    } catch (e) {
      logger.debug(
        "nativeTheme.themeSource set failed",
        "SettingsService",
        (e as Error).message
      );
    }
    this.saveSettings({ themeSource: source });
    const eff = this.effectiveTheme(source);
    this.notifyAll("app:theme-changed", { source, effective: eff });
    return { source, effective: eff };
  }

  private notifyAll(channel: string, ...args: unknown[]) {
    BrowserWindow.getAllWindows().forEach((w) =>
      w.webContents.send(channel, ...args)
    );
  }

  setupNativeThemeListener(): void {
    nativeTheme.on("updated", () => {
      const s = this.loadSettings();
      const source = s.themeSource ?? "system";
      if (source === "system") {
        this.notifyAll("app:theme-changed", {
          source,
          effective: this.effectiveTheme(source),
        });
      }
    });
  }
}
