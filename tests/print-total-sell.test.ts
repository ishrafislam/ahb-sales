import { describe, it, expect, beforeEach } from "vitest";
import { buildTotalSellDocument } from "../src/print/totalSell";
import { currentLang } from "../src/i18n";
import type { TotalSellReport } from "../src/main/data";

const report: TotalSellReport = {
  days: [
    {
      date: "27-06-2026",
      rows: [
        { productId: 2, productNameBn: "ফেলাও ইষ্ট", unit: "কার্টুন", quantity: 2 },
        { productId: 81, productNameBn: "এ্যামুনিয়া", unit: "কেজি", quantity: 6 },
      ],
    },
    {
      date: "28-06-2026",
      rows: [{ productId: 5, productNameBn: "তেল", quantity: 3 }],
    },
  ],
};

describe("buildTotalSellDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("labels each day's date", () => {
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).toContain("Date : Saturday, June 27, 2026");
    expect(bodyHtml).toContain("Date : Sunday, June 28, 2026");
  });

  it("localises the long date", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).not.toContain("June 27, 2026");
    // Bengali weekday and digits
    expect(bodyHtml).toContain("২০২৬");
  });

  it("keeps the raw date when it cannot be parsed", () => {
    const { bodyHtml } = buildTotalSellDocument({
      days: [{ date: "not-a-date", rows: [] }],
    });

    expect(bodyHtml).toContain("Date : not-a-date");
  });

  it("flows down one column then the next", () => {
    const doc = buildTotalSellDocument(report);

    expect(doc.columns).toBe(2);
    // The flow is the print module's job, not a grid here
    expect(doc.styleCss).not.toContain("display: grid");
    // Tables break freely; only the heading sticks to its rows
    expect(doc.styleCss).not.toContain(".day { break-inside: avoid");
    expect(doc.styleCss).toContain("break-after: avoid");
    expect(doc.styleCss).toContain("column-span: all");
  });

  it("prints no date range", () => {
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).not.toContain("From");
    expect(bodyHtml).not.toContain("class=\"meta\"");
  });

  it("prints no per-day total row", () => {
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).not.toContain("<tfoot>");
    // The only "Total" left is the report's own heading
    expect(bodyHtml.match(/Total/g)).toEqual(["Total"]);
  });

  it("splits the amount into a number cell and a unit cell", () => {
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).toContain('<td class="qty">2</td>');
    expect(bodyHtml).toContain('<td class="unit">কার্টুন</td>');
    expect(bodyHtml).toContain('<td class="qty">6</td>');
    expect(bodyHtml).toContain('<td class="unit">কেজি</td>');
    // An item whose product is gone still shows the bare quantity
    expect(bodyHtml).toContain('<td class="qty">3</td>');
    expect(bodyHtml).toContain('<td class="unit"></td>');
  });

  it("covers both amount cells with one header", () => {
    const { bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).toContain(
      '<th class="amount" colspan="2">Amount</th>'
    );
    // Only the three headers, so the split is invisible in the head row
    expect(bodyHtml.match(/<th /g)).toHaveLength(6);
  });

  it("ranges ids and names left, amounts right", () => {
    const { styleCss, bodyHtml } = buildTotalSellDocument(report);

    expect(bodyHtml).toContain('<td class="id">2</td>');
    expect(bodyHtml).toContain('<td class="name">ফেলাও ইষ্ট</td>');
    expect(styleCss).toContain(".day .id { text-align: left; }");
    expect(styleCss).toContain(".day .name { text-align: left; }");
    // Numbers right, units left, so the digits share a vertical
    expect(styleCss).toContain(".day .qty { text-align: right;");
    expect(styleCss).toContain(".day .unit { text-align: left;");
    expect(styleCss).toContain("table-layout: fixed");
  });

  it("gives the number and unit columns equal width, via the colgroup", () => {
    const { styleCss, bodyHtml } = buildTotalSellDocument(report);

    // Widths must come off the colgroup: the colspan header would otherwise
    // decide how that band splits under fixed layout
    expect(bodyHtml).toContain('<col class="c-qty" />');
    expect(bodyHtml).toContain('<col class="c-unit" />');
    expect(styleCss).toContain(".day .c-qty { width: 20%; }");
    expect(styleCss).toContain(".day .c-unit { width: 20%; }");
  });

  it("centres the Amount header over its two columns", () => {
    const { styleCss } = buildTotalSellDocument(report);

    expect(styleCss).toContain(".day .amount { text-align: center; }");
  });

  it("rules the table horizontally only", () => {
    const { styleCss } = buildTotalSellDocument(report);

    expect(styleCss).toContain("border: none; border-bottom: 1px solid");
    // No all-round cell border anywhere
    expect(styleCss).not.toMatch(/border:\s*1px solid/);
  });

  it("falls back to the empty line when nothing sold", () => {
    const { bodyHtml } = buildTotalSellDocument({ days: [] });

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain("class=\"days\"");
  });
});
