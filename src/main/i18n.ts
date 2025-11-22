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
  // Default to English in test environment, Bengali otherwise
  const defaultLang = process.env.NODE_ENV === "test" ? "en" : "bn";
  return { language: defaultLang };
}

function saveSettings(s: Settings) {
  try {
    const p = settingsPath();
    let existing: Record<string, unknown> = {};
    try {
      if (fs.existsSync(p)) {
        existing = JSON.parse(fs.readFileSync(p, "utf8"));
      }
    } catch {
      existing = {};
    }
    const merged = { ...existing, language: s.language };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf8");
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
