import { app, nativeTheme, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";

export type PrintSettings = {
  paperSize: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: number; // uniform margin in mm
  printerDevice?: string;
};

export type ThemeSource = "system" | "light" | "dark";

export type AppSettings = {
  print: PrintSettings;
  language?: "bn" | "en";
  themeSource?: ThemeSource;
};

const defaultPrintSettings: PrintSettings = {
  paperSize: "A4",
  orientation: "portrait",
  marginMm: 12,
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
        return { print: defaultPrintSettings, themeSource: "system" };
      const raw = fs.readFileSync(p, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        print: { ...defaultPrintSettings, ...(parsed.print ?? {}) },
        language: parsed.language,
        themeSource: parsed.themeSource ?? "system",
      } as AppSettings;
    } catch {
      return { print: defaultPrintSettings, themeSource: "system" };
    }
  }

  saveSettings(next: Partial<AppSettings>): void {
    try {
      const p = this.getSettingsPath();
      const existing = this.loadSettings();
      const merged: AppSettings = {
        ...existing,
        ...next,
        print: next.print
          ? { ...existing.print, ...next.print }
          : existing.print,
      } as AppSettings;
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  getPrintSettings(): PrintSettings {
    return this.loadSettings().print;
  }

  setPrintSettings(settings: Partial<PrintSettings>): PrintSettings {
    const cur = this.loadSettings().print;
    const next = { ...cur, ...settings } as PrintSettings;
    this.saveSettings({ print: next });
    return next;
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
      console.debug("nativeTheme.themeSource set failed", (e as Error).message);
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
