import { describe, it, expect, beforeEach } from "vitest";
import { buildInvoiceDocument } from "../src/print/invoice";
import { currentLang } from "../src/i18n";
import type { Invoice } from "../src/main/data";

const invoice = {
  id: "inv-1",
  no: 42,
  date: "2026-07-30T10:00:00.000Z",
  customerId: 100,
  lines: [
    {
      productId: 1,
      quantity: 25,
      unit: "Bag",
      rate: 466,
      lineTotal: 11650,
    },
    {
      productId: 3,
      quantity: 2,
      unit: "kg",
      rate: 12.5,
      lineTotal: 25,
    },
  ],
  totals: { subtotal: 11675, net: 11175 },
  discount: 500,
  previousDue: 300,
  paid: 1000,
  currentDue: 10475,
} as unknown as Invoice;

const opts = {
  businessName: "ABDUL HAMID AND BROTHERS",
  customerName: "Karim Store",
  products: {
    1: { name: "Item 1", unit: "Bag" },
    3: { name: "Item 3", unit: "kg" },
  },
};

describe("buildInvoiceDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("titles the document with the invoice number", () => {
    expect(buildInvoiceDocument(invoice, opts).title).toContain("42");
  });

  it("takes the shop name from the locale when none is passed", () => {
    const noName = { ...opts, businessName: undefined };
    expect(buildInvoiceDocument(invoice, noName).bodyHtml).toContain(
      "ABDUL HAMID AND BROTHERS"
    );

    currentLang.value = "bn";
    expect(buildInvoiceDocument(invoice, noName).bodyHtml).toContain(
      "আব্দুল হামিদ এন্ড ব্রাদার্স"
    );
  });

  it("rules the totals with solid lines, not dashes", () => {
    const { styleCss } = buildInvoiceDocument(invoice, opts);
    expect(styleCss).not.toContain("dashed");
    expect(styleCss).toContain("border-bottom: 1px solid #000");
  });

  it("renders the header, both lines and the totals", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, opts);

    expect(bodyHtml).toContain("ABDUL HAMID AND BROTHERS");
    expect(bodyHtml).toContain("Karim Store");
    expect(bodyHtml).toContain("Item 1");
    expect(bodyHtml).toContain("25 Bag");
    expect(bodyHtml).toContain("Item 3");
    expect(bodyHtml).toContain("2 kg");
    // net, previous due, grand total, paid, current due
    expect(bodyHtml).toContain("11,175.00");
    expect(bodyHtml).toContain("300.00");
    expect(bodyHtml).toContain("11,475.00");
    expect(bodyHtml).toContain("1,000.00");
    expect(bodyHtml).toContain("10,475.00");
  });

  it("falls back to the product id when a name is missing", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, {
      ...opts,
      products: {},
    });

    expect(bodyHtml).toContain("<td>1</td>");
    expect(bodyHtml).toContain("<td>3</td>");
  });

  it("includes the notes block only when there are notes", () => {
    expect(buildInvoiceDocument(invoice, opts).bodyHtml).not.toContain(
      "class=\"notes\""
    );

    const withNotes = buildInvoiceDocument(
      { ...invoice, notes: "Deliver Friday" } as Invoice,
      opts
    );
    expect(withNotes.bodyHtml).toContain("Deliver Friday");
  });

  it("dates the previous due when a prior invoice is supplied", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, {
      ...opts,
      previousDueDate: "2026-07-01T10:00:00.000Z",
    });

    expect(bodyHtml).toContain("01/07/2026");
  });

  it("leaves page setup to the print module", () => {
    const { styleCss, pageSize } = buildInvoiceDocument(invoice, opts);

    // The module owns @page, the body box and the page size
    expect(styleCss).not.toContain("@page");
    expect(styleCss).not.toMatch(/(^|[^.\w])body\s*\{/);
    expect(pageSize).toBeUndefined();
    // Every rule is scoped to the receipt
    expect(styleCss).toContain(".receipt {");
    expect(styleCss).toContain("width: 72mm");
  });

  it("prints an item given away with no quantity and no price", () => {
    const free = {
      ...invoice,
      lines: [
        invoice.lines[0],
        { productId: 3, quantity: 0, unit: "kg", rate: 12.5, lineTotal: 0 },
      ],
    } as unknown as Invoice;
    const { bodyHtml } = buildInvoiceDocument(free, opts);

    const rows = bodyHtml.split("<tr>");
    const freeRow = rows.find((r) => r.includes("Item 3"))!;
    expect(freeRow).toContain("<td>Item 3</td>");
    expect(freeRow).toContain('<td style="text-align:center"></td>');
    expect(freeRow).toContain('<td style="text-align:right"></td>');
    // The paid line is untouched
    const paidRow = rows.find((r) => r.includes("Item 1"))!;
    expect(paidRow).toContain("25 Bag");
    expect(paidRow).toContain("11,650.00");
  });

  it("keeps the totals at the bottom of the sheet", () => {
    const { bodyHtml, fillPage } = buildInvoiceDocument(
      { ...invoice, notes: "Delivered" } as unknown as Invoice,
      opts
    );

    // The print module supplies the page-height box the block is pushed to
    expect(fillPage).toBe(true);
    expect(bodyHtml).toContain('class="receipt page-fill"');

    const tail = bodyHtml.slice(bodyHtml.indexOf('<div class="page-bottom">'));
    expect(tail).toContain("Bill :");
    expect(tail).toContain("Current Due :");
    expect(tail).toContain("Notes: Delivered");
    // Only the totals travel down; the items stay where they are
    expect(tail).not.toContain("Item 1");
  });

  it("prints the customer's address and phone when the record has them", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, {
      ...opts,
      customerPhone: "01711000111",
      customerAddress: "12 Moulvi Bazar, Dhaka",
    });

    expect(bodyHtml).toContain("12 Moulvi Bazar, Dhaka");
    expect(bodyHtml).toContain("01711000111");
  });

  it("leaves the customer lines out when the fields are missing", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, opts);

    expect(bodyHtml).not.toContain('class="cust"');
  });

  it("prints the time of the sale under the date", () => {
    const local = new Date(invoice.date);
    const h24 = local.getHours();
    const expected = `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(
      local.getMinutes()
    ).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;

    expect(buildInvoiceDocument(invoice, opts).bodyHtml).toContain(expected);
  });

  it("prints no time when the invoice carries only a date", () => {
    const dateOnly = { ...invoice, date: "2026-07-30" } as unknown as Invoice;

    expect(buildInvoiceDocument(dateOnly, opts).bodyHtml).not.toContain(
      'class="time"'
    );
  });

  it("prints the last action's time, not the posting time", () => {
    // Edited later the same day: a payment, or a re-post of the lines
    const edited = {
      ...invoice,
      updatedAt: "2026-07-30T16:45:00.000Z",
    } as unknown as Invoice;
    const timeOf = (iso: string) => {
      const d = new Date(iso);
      const h24 = d.getHours();
      return `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(
        d.getMinutes()
      ).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
    };
    const { bodyHtml } = buildInvoiceDocument(edited, opts);

    expect(bodyHtml).toContain(timeOf(edited.updatedAt));
    expect(bodyHtml).not.toContain(timeOf(invoice.date));
    // Same day, so the time carries no date of its own: the invoice's date
    // appears once, above it
    expect((bodyHtml.match(/30\/07\/26/g) ?? []).length).toBe(1);
  });

  it("dates the time when the last action fell on another day", () => {
    const editedNextDay = {
      ...invoice,
      updatedAt: "2026-07-31T09:15:00.000Z",
    } as unknown as Invoice;
    const { bodyHtml } = buildInvoiceDocument(editedNextDay, opts);

    // The invoice keeps its own date; the time says which day it belongs to
    expect(bodyHtml).toContain("30/07/26");
    expect(bodyHtml).toMatch(/class="time">31\/07\/26 /);

    currentLang.value = "bn";
    const bn = buildInvoiceDocument(editedNextDay, opts).bodyHtml;
    expect(bn).toMatch(/class="time">৩১\/০৭\/২৬ /);
  });

  it("switches digits and font for Bengali", () => {
    currentLang.value = "bn";
    const { bodyHtml, styleCss } = buildInvoiceDocument(invoice, opts);

    // Customer id and date render in Bengali digits
    expect(bodyHtml).toContain("১০০");
    expect(bodyHtml).toContain("৩০/০৭/২৬");
    // Line quantities and every figure in the totals block too
    expect(bodyHtml).toContain("২৫ Bag");
    expect(bodyHtml).toContain("১১,৬৫০.০০");
    expect(bodyHtml).toContain("১০,৪৭৫.০০");
    expect(styleCss).toContain("Noto Sans Bengali");
    // The sale time reads as a part of the day, in Bengali digits
    expect(bodyHtml).toMatch(/রাত|সকাল|দুপুর|বিকাল|সন্ধ্যা/);
  });
});
