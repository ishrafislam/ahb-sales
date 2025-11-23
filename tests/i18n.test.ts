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
