import { describe, it, expect } from "vitest";
import {
  rowsToTsv,
  tsvToRows,
  type SheetRow,
} from "../../../src/components/dashboard/selectionClipboard";

const rows: SheetRow[] = [
  { id: 5, name: "চাল", quantity: 3, unit: "kg" },
  { id: 7, name: "সরিষার তেল", quantity: 2.5, unit: "L" },
];

describe("selectionClipboard", () => {
  it("writes one tab-separated line per row", () => {
    expect(rowsToTsv(rows)).toBe("5\tচাল\t3\tkg\n7\tসরিষার তেল\t2.5\tL");
  });

  it("reads back what it wrote, names with spaces included", () => {
    expect(tsvToRows(rowsToTsv(rows))).toEqual(rows);
  });

  it("takes a paste written in Bengali digits", () => {
    expect(tsvToRows("৫\tচাল\t৩\tkg")).toEqual([
      { id: 5, name: "চাল", quantity: 3, unit: "kg" },
    ]);
  });

  it("drops anything that is not a row", () => {
    const text = ["5\tচাল\t3\tkg", "", "just some text", "\t\t\t", "7\tডাল\t1\tkg", ""].join(
      "\r\n"
    );

    expect(tsvToRows(text).map((r) => r.id)).toEqual([5, 7]);
  });

  it("has nothing to say about an empty clipboard", () => {
    expect(tsvToRows("")).toEqual([]);
  });
});
