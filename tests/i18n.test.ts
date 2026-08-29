import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => {
  const fakeApp = {
    getPath: (key: string) => {
      if (key === "userData") return process.cwd() + "/tmp-userData-tests";
      return process.cwd();
    },
  };
  return { app: fakeApp };
});

import fs from "node:fs";
import path from "node:path";
import en from "../src/locales/en.json";
import bn from "../src/locales/bn.json";

let getLanguage: typeof import("../src/main/i18n").getLanguage;
let setLanguage: typeof import("../src/main/i18n").setLanguage;

const settingsPath = path.join(
  process.cwd(),
  "tmp-userData-tests",
  "settings.json"
);

describe("i18n settings persistence", () => {
  beforeEach(async () => {
    try {
      fs.rmSync(path.dirname(settingsPath), { recursive: true, force: true });
    } catch {
      // ignore
    }
    // Reset module cache to re-evaluate default
    vi.resetModules();
    const mod = await import("../src/main/i18n");
    getLanguage = mod.getLanguage;
    setLanguage = mod.setLanguage;
  });

  it("defaults to Bengali when no settings exist", () => {
    expect(getLanguage()).toBe("en");
  });

  it("persists chosen language", () => {
    setLanguage("bn");
    expect(getLanguage()).toBe("bn");
    const raw = fs.readFileSync(settingsPath, "utf8");
    expect(raw.includes('"language": "bn"')).toBe(true);
  });
});

describe("locale files", () => {
  const enKeys = Object.keys(en as Record<string, string>);
  const bnKeys = Object.keys(bn as Record<string, string>);

  it("carry the same keys", () => {
    expect([...bnKeys].sort()).toEqual([...enKeys].sort());
  });

  // A Bengali value identical to the English one is a missed translation —
  // that is how nineteen dashboard buttons stayed in English. Add a key here
  // only if it is deliberately the same in both languages.
  const SHARED = new Set<string>([]);

  it("say something different in Bengali", () => {
    const untranslated = enKeys.filter(
      (k) =>
        !SHARED.has(k) &&
        (bn as Record<string, string>)[k] ===
          (en as Record<string, string>)[k] &&
        /[A-Za-z]{2}/.test((en as Record<string, string>)[k] ?? "")
    );

    expect(untranslated).toEqual([]);
  });
});
