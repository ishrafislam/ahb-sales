import { describe, it, expect, beforeEach } from "vitest";
import { buildSelectPrintDocument } from "../src/print/selectPrint";
import { currentLang } from "../src/i18n";

const rows = [
  { id: 5, name: "চাল", quantity: 3, unit: "kg" },
  { id: 7, name: "ডাল", quantity: 2.5, unit: "kg" },
];

describe("buildSelectPrintDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("heads the sheet with the day and the godown", () => {
    const { bodyHtml, title } = buildSelectPrintDocument({
      date: "2026-07-30T10:00:00.000Z",
      godown: "4",
      rows,
    });

    expect(title).toBe("Select Print");
    expect(bodyHtml).toContain("Date : 30/07/2026");
    expect(bodyHtml).toContain("Godown : 4");
  });

  it("lists id, name, quantity and unit — and no money", () => {
    const { bodyHtml } = buildSelectPrintDocument({
      date: "2026-07-30T10:00:00.000Z",
      godown: "0",
      rows,
    });

    expect(bodyHtml).toContain(">5<");
    expect(bodyHtml).toContain("চাল");
    expect(bodyHtml).toContain(">2.5<");
    expect(bodyHtml).toContain(">kg<");
    expect(bodyHtml).not.toContain("0.00");
  });

  it("says so when nothing was pasted", () => {
    const { bodyHtml } = buildSelectPrintDocument({
      date: "2026-07-30T10:00:00.000Z",
      godown: "0",
      rows: [],
    });

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain("<table>");
  });

  it("prints Bengali numerals in Bengali", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildSelectPrintDocument({
      date: "2026-07-30T10:00:00.000Z",
      godown: "4",
      rows,
    });

    expect(bodyHtml).toContain("৩০/০৭/২০২৬");
    expect(bodyHtml).toContain("৪");
    expect(bodyHtml).toContain(">২.৫<");
    currentLang.value = "en";
  });
});
