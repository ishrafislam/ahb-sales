import { describe, it, expect } from "vitest";
import { editDistance, matchByName } from "../../src/utils/fuzzy";

describe("editDistance", () => {
  it("counts insertions, deletions and substitutions", () => {
    expect(editDistance("karim", "karim", 3)).toBe(0);
    expect(editDistance("karim", "korim", 3)).toBe(1);
    expect(editDistance("karim", "kari", 3)).toBe(1);
    expect(editDistance("karim", "karimx", 3)).toBe(1);
    expect(editDistance("karim", "kaarim", 3)).toBe(1);
  });

  it("gives up past the cap instead of counting all the way", () => {
    // Only the "over the cap" fact is promised, not the exact number
    expect(editDistance("karim", "something else", 2)).toBeGreaterThan(2);
    expect(editDistance("", "abc", 2)).toBe(3);
    expect(editDistance("abc", "", 2)).toBe(3);
  });
});

describe("matchByName", () => {
  type Rec = { id: number; name: string };
  const records: Rec[] = [
    { id: 1, name: "Karim Store" },
    { id: 2, name: "Rahim Traders" },
    { id: 3, name: "কুসুম বেকারি" },
    { id: 4, name: "" },
  ];
  const match = (q: string, limit?: number) =>
    matchByName(records, q, (r) => r.name, limit);

  it("returns substring hits in order, not marked approximate", () => {
    const hits = match("im");

    expect(hits.map((h) => h.item.id)).toEqual([1, 2]);
    expect(hits.every((h) => h.approximate)).toBe(false);
  });

  it("ignores case and surrounding space", () => {
    expect(match("  KARIM ").map((h) => h.item.id)).toEqual([1]);
  });

  it("falls back to close spellings only when nothing matches outright", () => {
    const hits = match("korim");

    expect(hits.map((h) => h.item.id)).toEqual([1]);
    expect(hits[0]!.approximate).toBe(true);
  });

  it("forgives a typo inside a longer name", () => {
    expect(match("bekari").map((h) => h.item.id)).toEqual([]);
    expect(match("kusum bekari").map((h) => h.item.id)).toEqual([]);
    // One letter wrong against a name it does contain
    expect(match("Rahim Traderz").map((h) => h.item.id)).toEqual([2]);
  });

  it("keeps unrelated words out", () => {
    expect(match("elephant")).toEqual([]);
  });

  it("matches Bengali text and reads Bengali numerals as Latin", () => {
    expect(match("কুসুম").map((h) => h.item.id)).toEqual([3]);
    expect(
      matchByName(
        [{ id: 1, name: "Shop 21" }],
        "shop ২১",
        (r) => r.name
      ).map((h) => h.item.id)
    ).toEqual([1]);
  });

  it("returns nothing for a blank query, and honours the limit", () => {
    expect(match("")).toEqual([]);
    expect(match("   ")).toEqual([]);
    expect(match("im", 1)).toHaveLength(1);
  });

  it("never suggests a record with no name", () => {
    expect(match("x").some((h) => h.item.id === 4)).toBe(false);
  });
});
