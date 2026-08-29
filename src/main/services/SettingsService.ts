import { app, nativeTheme, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./Logger";
import { normalizeMargins, type PrintMargins } from "../../print/document";
import { MM_PER_INCH } from "../../constants/business";

export type ThemeSource = "system" | "light" | "dark";

export type AppSettings = {
  language?: "bn" | "en";
  themeSource?: ThemeSource;
  /** Last margins used in the print preview, in inches, reused as the default */
  printMarginsIn?: PrintMargins;
  /** Millimetre margins written before the switch to inches; read once */
  printMargins?: PrintMargins;
};

/**
 * Settings written by an older build hold the margins in millimetres. Read as
 * inches they would be a full-page border, so they are converted the first
 * time they are read and rewritten under the new key on the next save.
 */
export function marginsFromSettings(
  parsed: Partial<AppSettings>
): PrintMargins | undefined {
  if (parsed.printMarginsIn) return parsed.printMarginsIn;
  const mm = parsed.printMargins;
  if (!mm) return undefined;
  return {
    top: mm.top / MM_PER_INCH,
    bottom: mm.bottom / MM_PER_INCH,
    left: mm.left / MM_PER_INCH,
    right: mm.right / MM_PER_INCH,
  };
}

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
        printMarginsIn: marginsFromSettings(parsed),
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

  getPrintMargins(): PrintMargins {
    return normalizeMargins(this.loadSettings().printMarginsIn);
  }

  setPrintMargins(margins: PrintMargins): void {
    this.saveSettings({ printMarginsIn: normalizeMargins(margins) });
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
