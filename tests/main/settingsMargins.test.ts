import { describe, it, expect, vi } from "vitest";

// SettingsService reaches for Electron at import time; only the pure migration
// helper is under test here.
vi.mock("electron", () => ({
  app: { getPath: () => "/tmp" },
  nativeTheme: { shouldUseDarkColors: false },
  BrowserWindow: { getAllWindows: () => [] },
}));

import { marginsFromSettings } from "../../src/main/services/SettingsService";

describe("marginsFromSettings", () => {
  const inches = { top: 0.5, bottom: 0.5, left: 1, right: 1 };

  it("takes the inch margins as they are", () => {
    expect(marginsFromSettings({ printMarginsIn: inches })).toEqual(inches);
  });

  it("converts margins written before the switch to inches", () => {
    const converted = marginsFromSettings({
      printMargins: { top: 12, bottom: 12, left: 25.4, right: 0 },
    })!;

    expect(converted.top).toBeCloseTo(0.472, 3);
    expect(converted.left).toBeCloseTo(1, 5);
    expect(converted.right).toBe(0);
  });

  it("prefers the inch key when a stale millimetre one is still there", () => {
    expect(
      marginsFromSettings({
        printMarginsIn: inches,
        printMargins: { top: 40, bottom: 40, left: 40, right: 40 },
      })
    ).toEqual(inches);
  });

  it("has nothing to offer for empty settings", () => {
    expect(marginsFromSettings({})).toBeUndefined();
  });
});
