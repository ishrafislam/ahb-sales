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

  it("renders the header, both lines and the totals", () => {
    const { bodyHtml } = buildInvoiceDocument(invoice, opts);

    expect(bodyHtml).toContain("ABDUL HAMID AND BROTHERS");
    expect(bodyHtml).toContain("Karim Store");
    expect(bodyHtml).toContain("Item 1");
    expect(bodyHtml).toContain("25 Bag");
    expect(bodyHtml).toContain("Item 3");
    expect(bodyHtml).toContain("2 kg");
    // net, previous due, grand total, paid, current due
    expect(bodyHtml).toContain("11175.00");
    expect(bodyHtml).toContain("300.00");
    expect(bodyHtml).toContain("11475.00");
    expect(bodyHtml).toContain("1000.00");
    expect(bodyHtml).toContain("10475.00");
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

  it("switches digits and font for Bengali", () => {
    currentLang.value = "bn";
    const { bodyHtml, styleCss } = buildInvoiceDocument(invoice, opts);

    // Customer id and date render in Bengali digits
    expect(bodyHtml).toContain("১০০");
    expect(bodyHtml).toContain("৩০/০৭/২৬");
    expect(styleCss).toContain("Noto Sans Bengali");
    // The sale time reads as a part of the day, in Bengali digits
    expect(bodyHtml).toMatch(/রাত|সকাল|দুপুর|বিকাল|সন্ধ্যা/);
  });
});
