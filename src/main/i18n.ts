import { app } from "electron";
import path from "node:path";
import fs from "node:fs";

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

// Minimal dictionary example (extend later)
export const dict: Record<Lang, Record<string, string>> = {
  en: {
    app_title: "AHB Sales",
    menu_file: "File",
    menu_new: "New",
    menu_open: "Open",
    menu_save: "Save",
    menu_save_as: "Save As",
  },
  bn: {
    app_title: "এএইচবি সেলস",
    menu_file: "ফাইল",
    menu_new: "নতুন",
    menu_open: "ওপেন",
    menu_save: "সেভ",
    menu_save_as: "সেভ অ্যাজ",
  },
};
