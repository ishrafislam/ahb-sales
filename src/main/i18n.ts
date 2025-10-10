import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import en from "../locales/en.json";
import bn from "../locales/bn.json";

type Lang = "bn" | "en";

// Simple settings persistence in userData
const settingsPath = () => path.join(app.getPath("userData"), "settings.json");

type Settings = { language: Lang };

function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.language === "bn" || parsed.language === "en")) {
      return { language: parsed.language };
    }
  } catch {
    // ignore missing or invalid settings
  }
  return { language: "bn" };
}

function saveSettings(s: Settings) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2), "utf8");
  } catch (err) {
    // Log failure instead of failing silently; could be enhanced to notify renderer via IPC.
    console.error("Failed to save settings:", err);
  }
}

const current = loadSettings();

export function getLanguage(): Lang {
  return current.language;
}

export function setLanguage(lang: Lang) {
  current.language = lang;
  saveSettings(current);
}

// Standard locale mapping files
export const dict: Record<Lang, Record<string, string>> = {
  en,
  bn,
};
