import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTheme, setTheme } from "../src/theme";
type ThemePayloadTest = { source: string; effective: "light" | "dark" };

describe("theme module", () => {
  const listeners: Record<string, Array<(p: ThemePayloadTest) => void>> = {};
  const fakeAPI = {
    getTheme: vi.fn(async () => ({ source: "system", effective: "light" })),
    setTheme: vi.fn(async (source: string) => ({
      source,
      effective: source === "dark" ? "dark" : "light",
    })),
    onThemeChanged: vi.fn((cb: (p: ThemePayloadTest) => void) => {
      (listeners["app:theme-changed"] ||= []).push(cb);
      return () => {
        listeners["app:theme-changed"] = listeners["app:theme-changed"].filter(
          (f) => f !== cb
        );
      };
    }),
  };

  beforeEach(() => {
    document.documentElement.className = "";
    // @ts-expect-error: test env window shim
    global.window = { ahb: fakeAPI };
    fakeAPI.getTheme.mockClear();
    fakeAPI.setTheme.mockClear();
  });

  it("initializes and applies light class (no dark)", async () => {
    await initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(fakeAPI.getTheme).toHaveBeenCalled();
  });

  it('applies dark class after setTheme("dark")', async () => {
    await initTheme();
    await setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
