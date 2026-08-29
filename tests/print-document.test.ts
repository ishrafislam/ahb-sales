import { describe, it, expect } from "vitest";
import {
  composePrintHtml,
  DEFAULT_MARGINS,
  columnGapIn,
  inToMm,
  mmToPx,
  normalizeMargins,
  pageContentSizeMm,
  pageCountFor,
  pageSizeMm,
} from "../src/print/document";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  MAX_MARGIN_IN,
  MAX_PREVIEW_PAGES,
} from "../src/constants/business";

describe("normalizeMargins", () => {
  it("falls back to the defaults for missing or unusable values", () => {
    expect(normalizeMargins()).toEqual(DEFAULT_MARGINS);
    expect(normalizeMargins({ top: 1.25 })).toEqual({
      ...DEFAULT_MARGINS,
      top: 1.25,
    });
    expect(
      normalizeMargins({ top: NaN, bottom: undefined } as never).top
    ).toBe(DEFAULT_MARGINS.top);
  });

  it("clamps to the allowed range", () => {
    expect(normalizeMargins({ top: -10, bottom: 999 })).toMatchObject({
      top: 0,
      bottom: MAX_MARGIN_IN,
    });
  });

  it("rounds off the float dust a 0.1 step leaves behind", () => {
    expect(normalizeMargins({ top: 0.1 + 0.2 }).top).toBe(0.3);
  });
});

describe("inToMm", () => {
  it("converts inches to the millimetres the page is measured in", () => {
    expect(inToMm(1)).toBeCloseTo(25.4, 5);
    expect(inToMm(0.5)).toBeCloseTo(12.7, 5);
  });
});

describe("columnGapIn", () => {
  it("is the left plus the right margin, so the page period comes out exact", () => {
    expect(columnGapIn({ top: 1, bottom: 1, left: 0.75, right: 0.25 })).toBe(1);
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

  it("takes the margins out of the content box, converting to millimetres", () => {
    const box = pageContentSizeMm(
      {},
      { top: 0.5, bottom: 1, left: 0.25, right: 0.75 }
    );

    expect(box.width).toBeCloseTo(A4_WIDTH_MM - 25.4, 5);
    expect(box.height).toBeCloseTo(A4_HEIGHT_MM - 38.1, 5);
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
      top: 1.5,
      bottom: 0.4,
      left: 0.6,
      right: 0.2,
    });

    expect(html).toContain("@page { size: A4 portrait; margin: 0; }");
    expect(html).toContain("padding: 1.5in 0.2in 0.4in 0.6in;");
    expect(html).toContain(`width: ${A4_WIDTH_MM}mm;`);
  });

  it("stretches a fill-page document to the content height, and no other", () => {
    const margins = { top: 0.5, bottom: 1, left: 0.5, right: 0.5 };
    const html = composePrintHtml({ ...doc, fillPage: true }, margins);
    const expected = pageContentSizeMm({}, margins).height;

    expect(html).toContain(`min-height: ${expected}mm;`);
    expect(html).toContain(".page-bottom { margin-top: auto; }");

    // A report says nothing about filling the page and must be left alone
    const plain = composePrintHtml(doc, margins);
    expect(plain).not.toContain(".page-fill");
    expect(plain).not.toContain(".page-bottom");
  });

  it("shrinks the fill height as the vertical margins grow", () => {
    const tight = composePrintHtml({ ...doc, fillPage: true }, DEFAULT_MARGINS);
    const roomy = composePrintHtml(
      { ...doc, fillPage: true },
      { ...DEFAULT_MARGINS, bottom: DEFAULT_MARGINS.bottom + 1 }
    );
    const heightOf = (html: string) =>
      Number(/min-height: ([\d.]+)mm;/.exec(html)![1]);

    expect(heightOf(tight) - heightOf(roomy)).toBeCloseTo(25.4, 5);
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
    expect(html).toContain(`padding: ${MAX_MARGIN_IN}in`);
  });

  it("leaves a single-column document to the printer's own pagination", () => {
    expect(composePrintHtml(doc, DEFAULT_MARGINS, "print")).not.toContain(
      "column-"
    );
  });

  it("states one column per page for each page the frame spans", () => {
    // The count is stated rather than fitted by width: the fit lands on an
    // exact integer, where a fraction of a pixel can drop a column
    expect(composePrintHtml(doc, DEFAULT_MARGINS, "preview", 3)).toContain(
      "column-count: 3"
    );
    expect(
      composePrintHtml({ ...doc, columns: 2 }, DEFAULT_MARGINS, "preview", 3)
    ).toContain("column-count: 6");
    // A nonsense count still leaves one column
    expect(composePrintHtml(doc, DEFAULT_MARGINS, "preview", 0)).toContain(
      "column-count: 1"
    );
  });

  it("previews a single-column document as one page-wide column", () => {
    const margins = { top: 1, bottom: 1, left: 0.75, right: 0.25 };
    const html = composePrintHtml(doc, margins, "preview");

    // One column to a page, overflowing sideways, so the preview breaks
    // between rows the way the printer will rather than slicing through them
    expect(html).toContain("column-count: 1");
    expect(html).toContain(`column-gap: ${0.75 + 0.25}in`);
    // The whole page, not the content box: box-sizing takes the margins out
    // of it, and a short column would break earlier than the paper does
    expect(html).toContain(`height: ${A4_HEIGHT_MM}mm`);
    expect(html).toContain("column-fill: auto");
    expect(html).not.toContain("column-width");
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
    expect(html).toContain(`column-gap: ${0.5 + 0.5}in`);
    expect(html).not.toContain("column-width");
  });

  it("overflows sideways when previewing two columns", () => {
    const margins = { top: 1, bottom: 1, left: 0.75, right: 0.25 };
    const html = composePrintHtml({ ...doc, columns: 2 }, margins, "preview");

    // One page tall, so the columns spill into the next page
    expect(html).toContain(`height: ${A4_HEIGHT_MM}mm`);
    expect(html).toContain("width: auto");
    expect(html).toContain(`column-gap: ${0.75 + 0.25}in`);
    // Two columns to the page
    expect(html).toContain("column-count: 2");
    expect(html).toContain("column-fill: auto");
    expect(html).not.toContain("column-width");
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
