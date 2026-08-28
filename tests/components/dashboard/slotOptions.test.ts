import { describe, it, expect } from "vitest";
import {
  toSlots,
  filterSlots,
  type SlotOption,
} from "../../../src/components/dashboard/slotOptions";

describe("toSlots", () => {
  it("pads a sparse record list out to the full range", () => {
    const slots = toSlots(
      [
        { id: 2, primary: "চাল", secondary: "মোটা" },
        { id: 1000, primary: "ডাল" },
      ],
      1000
    );

    expect(slots).toHaveLength(1000);
    expect(slots[0]).toEqual({ id: 1, primary: "" });
    expect(slots[1]).toEqual({ id: 2, primary: "চাল", secondary: "মোটা" });
    // A record without a secondary carries no key at all
    expect(slots[999]).toEqual({ id: 1000, primary: "ডাল" });
  });

  it("ignores records outside the range the id field can reach", () => {
    const slots = toSlots([{ id: 5000, primary: "দূরের" }], 10);

    expect(slots).toHaveLength(10);
    expect(slots.every((s) => s.primary === "")).toBe(true);
  });
});

describe("filterSlots", () => {
  const all: SlotOption[] = [
    { id: 2, primary: "চাল", secondary: "Moulvi Bazar" },
    { id: 21, primary: "Rice", secondary: "coarse" },
    { id: 214, primary: "", secondary: undefined },
    { id: 300, primary: "Dal", secondary: "red" },
  ];

  it("returns everything for a blank query", () => {
    expect(filterSlots(all, "")).toBe(all);
    expect(filterSlots(all, "   ")).toBe(all);
  });

  it("matches ids by prefix, so a partial number keeps its longer slots", () => {
    expect(filterSlots(all, "21").map((s) => s.id)).toEqual([21, 214]);
    expect(filterSlots(all, "214").map((s) => s.id)).toEqual([214]);
  });

  it("treats a padded id as the bare one, and all-zero as unfiltered", () => {
    expect(filterSlots(all, "0021").map((s) => s.id)).toEqual([21, 214]);
    expect(filterSlots(all, "000")).toBe(all);
  });

  it("reads Bengali numerals as the same ids", () => {
    expect(filterSlots(all, "২১").map((s) => s.id)).toEqual([21, 214]);
  });

  it("matches the name and the address or description, ignoring case", () => {
    expect(filterSlots(all, "চা").map((s) => s.id)).toEqual([2]);
    expect(filterSlots(all, "rice").map((s) => s.id)).toEqual([21]);
    expect(filterSlots(all, "BAZAR").map((s) => s.id)).toEqual([2]);
    expect(filterSlots(all, "red").map((s) => s.id)).toEqual([300]);
  });

  it("comes back empty when nothing matches", () => {
    expect(filterSlots(all, "nothing")).toEqual([]);
  });
});
