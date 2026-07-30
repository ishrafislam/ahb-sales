import { describe, it, expect } from "vitest";
import {
  composePrintHtml,
  DEFAULT_MARGINS,
  mmToPx,
  normalizeMargins,
  pageContentSizeMm,
  pageCountFor,
  pageSizeMm,
} from "../src/print/document";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  MAX_MARGIN_MM,
  MAX_PREVIEW_PAGES,
} from "../src/constants/business";

describe("normalizeMargins", () => {
  it("falls back to the defaults for missing or unusable values", () => {
    expect(normalizeMargins()).toEqual(DEFAULT_MARGINS);
    expect(normalizeMargins({ top: 5 })).toEqual({
      ...DEFAULT_MARGINS,
      top: 5,
    });
    expect(
      normalizeMargins({ top: NaN, bottom: undefined } as never).top
    ).toBe(DEFAULT_MARGINS.top);
  });

  it("clamps to the allowed range", () => {
    expect(normalizeMargins({ top: -10, bottom: 999 })).toMatchObject({
      top: 0,
      bottom: MAX_MARGIN_MM,
    });
  });
});

describe("page geometry", () => {
  it("converts millimetres at 96dpi", () => {
    expect(mmToPx(25.4)).toBeCloseTo(96, 5);
    expect(mmToPx(A4_HEIGHT_MM)).toBeCloseTo(1122.52, 1);
  });

  it("swaps the page for landscape", () => {
    expect(pageSizeMm({})).toEqual({
      width: A4_WIDTH_MM,
      height: A4_HEIGHT_MM,
    });
    expect(pageSizeMm({ orientation: "landscape" })).toEqual({
      width: A4_HEIGHT_MM,
      height: A4_WIDTH_MM,
    });
  });

  it("takes the margins out of the content box", () => {
    expect(
      pageContentSizeMm({}, { top: 10, bottom: 20, left: 15, right: 5 })
    ).toEqual({ width: A4_WIDTH_MM - 20, height: A4_HEIGHT_MM - 30 });
  });
});

describe("pageCountFor", () => {
  it("always yields at least one page", () => {
    expect(pageCountFor(0, 1000)).toBe(1);
    expect(pageCountFor(400, 1000)).toBe(1);
    expect(pageCountFor(NaN, 1000)).toBe(1);
    expect(pageCountFor(500, 0)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(pageCountFor(1000, 1000)).toBe(1);
    expect(pageCountFor(1001, 1000)).toBe(2);
    expect(pageCountFor(2400, 1000)).toBe(3);
  });

  it("caps a runaway document", () => {
    expect(pageCountFor(1e9, 100)).toBe(MAX_PREVIEW_PAGES);
  });
});

describe("composePrintHtml", () => {
  const doc = {
    title: "Money <Report>",
    bodyHtml: "<h1>Rows</h1>",
    styleCss: "h1 { color: red }",
  };

  it("puts the margins in the padding and asks the printer for none", () => {
    const html = composePrintHtml(doc, {
      top: 40,
      bottom: 10,
      left: 15,
      right: 5,
    });

    expect(html).toContain("@page { size: A4 portrait; margin: 0; }");
    expect(html).toContain("padding: 40mm 5mm 10mm 15mm;");
    expect(html).toContain(`width: ${A4_WIDTH_MM}mm;`);
  });

  it("carries the caller's markup and css through", () => {
    const html = composePrintHtml(doc, DEFAULT_MARGINS);

    expect(html).toContain("<h1>Rows</h1>");
    expect(html).toContain("<style>h1 { color: red }</style>");
    // Rows stay whole when the printer paginates
    expect(html).toContain("break-inside: avoid");
  });

  it("stops a table head or foot repeating on every fragment", () => {
    // Paged media repeats both; the preview's columns repeat neither, and a
    // repeated tfoot prints a table's totals partway through it
    for (const mode of ["print", "preview"] as const) {
      expect(composePrintHtml(doc, DEFAULT_MARGINS, mode)).toContain(
        "thead, tfoot { display: table-row-group; }"
      );
    }
  });

  it("escapes the title and clamps stray margins", () => {
    const html = composePrintHtml(doc, { top: 999 } as never);

    expect(html).toContain("<title>Money &lt;Report&gt;</title>");
    expect(html).toContain(`padding: ${MAX_MARGIN_MM}mm`);
  });

  it("leaves a single-column document to the printer's own pagination", () => {
    expect(composePrintHtml(doc, DEFAULT_MARGINS, "print")).not.toContain(
      "column-"
    );
  });

  it("previews a single-column document as one page-wide column", () => {
    const margins = { top: 40, bottom: 40, left: 20, right: 10 };
    const html = composePrintHtml(doc, margins, "preview");
    const content = pageContentSizeMm({}, margins);

    // One column to a page, overflowing sideways, so the preview breaks
    // between rows the way the printer will rather than slicing through them
    expect(html).toContain(`column-width: ${content.width}mm`);
    expect(html).toContain(`column-gap: ${20 + 10}mm`);
    // The whole page, not the content box: box-sizing takes the margins out
    // of it, and a short column would break earlier than the paper does
    expect(html).toContain(`height: ${A4_HEIGHT_MM}mm`);
    expect(html).toContain("column-fill: auto");
    expect(html).not.toContain("column-count");
  });

  it("fills column by column when printing two columns", () => {
    const html = composePrintHtml(
      { ...doc, columns: 2 },
      DEFAULT_MARGINS,
      "print"
    );

    expect(html).toContain("column-count: 2");
    expect(html).toContain("column-fill: auto");
    // Gap must equal left + right so the preview's page period works out
    expect(html).toContain(`column-gap: ${12 + 12}mm`);
    expect(html).not.toContain("column-width");
  });

  it("overflows sideways when previewing two columns", () => {
    const margins = { top: 40, bottom: 40, left: 20, right: 10 };
    const html = composePrintHtml({ ...doc, columns: 2 }, margins, "preview");
    const content = pageContentSizeMm({}, margins);

    // One page tall, so the columns spill into the next page
    expect(html).toContain(`height: ${A4_HEIGHT_MM}mm`);
    expect(html).toContain("width: auto");
    expect(html).toContain(`column-gap: ${20 + 10}mm`);
    expect(html).toContain(
      `column-width: ${(content.width - 30) / 2}mm`
    );
    expect(html).toContain("column-fill: auto");
    expect(html).not.toContain("column-count");
  });

  it("honours landscape", () => {
    const html = composePrintHtml(
      { ...doc, orientation: "landscape" },
      DEFAULT_MARGINS
    );

    expect(html).toContain("@page { size: A4 landscape; margin: 0; }");
    expect(html).toContain(`width: ${A4_HEIGHT_MM}mm;`);
  });
});
