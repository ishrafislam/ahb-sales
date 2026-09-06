import { describe, it, expect } from "vitest";
import { shouldRestoreParent } from "../../src/main/windowFocus";

const parent = { minimized: false, destroyed: false };

describe("shouldRestoreParent", () => {
  it("leaves macOS and Linux alone", () => {
    for (const platform of ["darwin", "linux"]) {
      expect(
        shouldRestoreParent({ platform, parent, liveSiblings: 0 })
      ).toEqual({ focus: false, restore: false });
    }
  });

  it("does nothing while other child windows are still open", () => {
    // The reported bug: reaching for the parent here left it minimised
    expect(
      shouldRestoreParent({ platform: "win32", parent, liveSiblings: 1 })
    ).toEqual({ focus: false, restore: false });
  });

  it("pulls the parent back when the last child closes", () => {
    expect(
      shouldRestoreParent({ platform: "win32", parent, liveSiblings: 0 })
    ).toEqual({ focus: true, restore: false });
  });

  it("un-minimises a parent Windows pushed down", () => {
    expect(
      shouldRestoreParent({
        platform: "win32",
        parent: { minimized: true, destroyed: false },
        liveSiblings: 0,
      })
    ).toEqual({ focus: true, restore: true });
  });

  it("never touches a destroyed parent", () => {
    expect(
      shouldRestoreParent({
        platform: "win32",
        parent: { minimized: true, destroyed: true },
        liveSiblings: 0,
      })
    ).toEqual({ focus: false, restore: false });
  });
});
