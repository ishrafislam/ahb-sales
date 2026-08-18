import { describe, it, expect, beforeEach } from "vitest";
import { buildDailyReportDocument } from "../src/print/dailyReport";
import { currentLang } from "../src/i18n";
import type { MoneyTxnDayWise, MoneyTxnDayWiseRow } from "../src/main/data";

function row(over: Partial<MoneyTxnDayWiseRow> = {}): MoneyTxnDayWiseRow {
  return {
    customerId: 40,
    customerName: "আলাউদ্দিন বেকারী",
    bill: 8220,
    discount: 0,
    netBill: 8220,
    paid: 8220,
    due: 0,
    previousDue: 0,
    totalDue: 0,
    hasInvoice: true,
    ...over,
  };
}

// The domain hands days back newest first
const report: MoneyTxnDayWise = {
  days: [
    {
      date: "28-06-2026",
      rows: [row({ customerId: 106, customerName: "মদিন এন্টারপ্রাইজ" })],
      totals: { bill: 8220, discount: 0, netBill: 8220, paid: 8220, due: 0 },
    },
    {
      date: "27-06-2026",
      rows: [
        row({ customerId: 213, customerName: "মুন্না ভাই", paid: 26000, previousDue: 178228 }),
        row({ customerId: 40 }),
      ],
      totals: {
        bill: 16440,
        discount: 0,
        netBill: 16440,
        paid: 34220,
        due: 0,
      },
    },
  ],
};

describe("buildDailyReportDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("labels each day with its long date, oldest first", () => {
    const { bodyHtml } = buildDailyReportDocument(report);

    expect(bodyHtml).toContain("Date : Saturday, June 27, 2026");
    expect(bodyHtml).toContain("Date : Sunday, June 28, 2026");
    expect(bodyHtml.indexOf("June 27")).toBeLessThan(
      bodyHtml.indexOf("June 28")
    );
  });

  it("prints the nine columns, id right and name left", () => {
    const { bodyHtml, styleCss } = buildDailyReportDocument(report);

    expect(bodyHtml).toContain('<td class="cid">40</td>');
    expect(bodyHtml).toContain('<td class="name">আলাউদ্দিন বেকারী</td>');
    // The id column carries no header
    expect(bodyHtml).toContain('<th class="cid"></th>');
    expect(bodyHtml).toContain('<th class="amt">Total Amount</th>');
    expect(bodyHtml).toContain('<th class="amt">Difference</th>');
    expect(bodyHtml).toContain('<th class="amt">Next Due</th>');
    expect(styleCss).toContain(".day .cid { text-align: right;");
    expect(styleCss).toContain(".day .name { text-align: left; }");
    expect(styleCss).toContain(".day .amt { text-align: right; }");
  });

  it("takes the column widths off the colgroup", () => {
    const { bodyHtml, styleCss } = buildDailyReportDocument(report);

    expect(bodyHtml).toContain('<col class="c-cid" />');
    expect(bodyHtml).toContain('<col class="c-next" />');
    expect(styleCss).toContain("table-layout: fixed");
    expect(styleCss).toContain(".day .c-cid { width: 6%; }");
  });

  it("carries a signed difference through to the next due", () => {
    const { bodyHtml } = buildDailyReportDocument({
      days: [
        {
          date: "27-06-2026",
          rows: [row({ netBill: 1000, paid: 1500, previousDue: 2000 })],
          totals: {
            bill: 1000,
            discount: 0,
            netBill: 1000,
            paid: 1500,
            due: 0,
          },
        },
      ],
    });

    // Overpaid by 500, so the difference is negative and the due comes down
    expect(bodyHtml).toContain('<td class="amt">-500.00</td>');
    expect(bodyHtml).toContain('<td class="amt">1,500.00</td>');
  });

  it("leaves previous and next due blank for a deposit-only row", () => {
    const { bodyHtml } = buildDailyReportDocument({
      days: [
        {
          date: "27-06-2026",
          rows: [
            row({
              bill: 0,
              netBill: 0,
              paid: 90,
              previousDue: 0,
              hasInvoice: false,
            }),
          ],
          totals: { bill: 0, discount: 0, netBill: 0, paid: 90, due: 0 },
        },
      ],
    });

    const cells = bodyHtml.match(/<td class="amt">[^<]*<\/td>/g)!;
    // total, discount, bill, deposit, difference, previous due, next due
    expect(cells.slice(0, 7)).toEqual([
      '<td class="amt">0.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">90.00</td>',
      '<td class="amt">-90.00</td>',
      '<td class="amt"></td>',
      '<td class="amt"></td>',
    ]);
  });

  it("totals five columns under each day and leaves the dues blank", () => {
    const { bodyHtml } = buildDailyReportDocument(report);
    const foot = bodyHtml.slice(bodyHtml.indexOf("<tfoot>"));
    const cells = foot.match(/<td class="amt">[^<]*<\/td>/g)!;

    expect(bodyHtml).toContain('<td class="name">Total :</td>');
    expect(cells.slice(0, 7)).toEqual([
      '<td class="amt">16,440.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">16,440.00</td>',
      '<td class="amt">34,220.00</td>',
      '<td class="amt">-17,780.00</td>',
      '<td class="amt"></td>',
      '<td class="amt"></td>',
    ]);
  });

  it("orders the rows by customer id", () => {
    const { bodyHtml } = buildDailyReportDocument(report);

    expect(bodyHtml.indexOf('<td class="cid">40</td>')).toBeLessThan(
      bodyHtml.indexOf('<td class="cid">213</td>')
    );
  });

  it("uses the full page width and rules the table horizontally only", () => {
    const doc = buildDailyReportDocument(report);

    expect(doc.columns).toBeUndefined();
    expect(doc.styleCss).toContain("border: none; border-bottom: 1px solid");
    expect(doc.styleCss).not.toMatch(/border:\s*1px solid/);
    // The table breaks freely; only the heading sticks to its rows
    expect(doc.styleCss).toContain("break-after: avoid");
    expect(doc.styleCss).not.toContain("break-inside: avoid");
  });

  it("localises the amounts and the date", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildDailyReportDocument(report);

    expect(bodyHtml).not.toContain("June 27, 2026");
    expect(bodyHtml).toContain("৮,২২০.০০");
  });

  it("escapes a customer name", () => {
    const { bodyHtml } = buildDailyReportDocument({
      days: [
        {
          date: "27-06-2026",
          rows: [row({ customerName: "A & <b>" })],
          totals: { bill: 0, discount: 0, netBill: 0, paid: 0, due: 0 },
        },
      ],
    });

    expect(bodyHtml).toContain('<td class="name">A &amp; &lt;b&gt;</td>');
  });

  it("falls back to the empty line when nothing happened", () => {
    const { bodyHtml } = buildDailyReportDocument({ days: [] });

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain('class="days"');
  });
});
