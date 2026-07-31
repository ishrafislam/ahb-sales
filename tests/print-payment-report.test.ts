import { describe, it, expect, beforeEach } from "vitest";
import { buildPaymentReportDocument } from "../src/print/paymentReport";
import { currentLang } from "../src/i18n";
import type { MoneyTxnDayWise, MoneyTxnDayWiseRow } from "../src/main/data";

function row(over: Partial<MoneyTxnDayWiseRow> = {}): MoneyTxnDayWiseRow {
  return {
    customerId: 23,
    customerName: "অনিন্দিতা বেকারী",
    bill: 33800,
    discount: 0,
    netBill: 33800,
    paid: 33800,
    due: 0,
    previousDue: 0,
    totalDue: 0,
    hasInvoice: true,
    ...over,
  };
}

function day(date: string, rows: MoneyTxnDayWiseRow[]) {
  return {
    date,
    rows,
    totals: rows.reduce(
      (t, r) => ({
        bill: t.bill + r.bill,
        discount: t.discount + r.discount,
        netBill: t.netBill + r.netBill,
        paid: t.paid + r.paid,
        due: t.due + r.due,
      }),
      { bill: 0, discount: 0, netBill: 0, paid: 0, due: 0 }
    ),
  };
}

// The domain hands days back newest first
const report: MoneyTxnDayWise = {
  days: [
    day("20-05-2025", [
      row({ customerId: 220, customerName: undefined, paid: 4320 }),
      row({ customerId: 221, customerName: undefined, paid: 4720 }),
    ]),
    day("19-05-2025", [
      row({ customerId: 25, customerName: "দেলোয়ার ব্রাদার্স", paid: 14460 }),
      row({ customerId: 23, paid: 33800 }),
      row({ customerId: 40, customerName: "আলাউদ্দিন বেকারী", paid: 0 }),
    ]),
  ],
};

describe("buildPaymentReportDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("is the payment report, flowing down one half of the page then the other", () => {
    const doc = buildPaymentReportDocument(report);

    expect(doc.title).toBe("Daily Payment Report");
    expect(doc.bodyHtml).toContain("<h1>Daily Payment Report :</h1>");
    expect(doc.columns).toBe(2);
    // The heading belongs to the page, not the left column
    expect(doc.styleCss).toContain("column-span: all");
  });

  it("prints id, name and deposit for each paying customer", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml).toContain('<td class="cid">25</td>');
    expect(bodyHtml).toContain('<td class="name">দেলোয়ার ব্রাদার্স</td>');
    expect(bodyHtml).toContain('<td class="amt">14,460.00</td>');
  });

  it("leaves out a customer who deposited nothing that day", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml).not.toContain("আলাউদ্দিন বেকারী");
    expect(bodyHtml).not.toContain('<td class="cid">40</td>');
  });

  it("drops a day left with no paying customer at all", () => {
    const { bodyHtml } = buildPaymentReportDocument({
      days: [
        day("21-05-2025", [row({ customerId: 9, paid: 0 })]),
        day("19-05-2025", [row({ customerId: 23, paid: 100 })]),
      ],
    });

    expect(bodyHtml).not.toContain("May 21");
    expect(bodyHtml.match(/<section class="day">/g)).toHaveLength(1);
  });

  it("reads forwards, oldest day first, and by customer id within a day", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml.indexOf("Monday, May 19, 2025")).toBeLessThan(
      bodyHtml.indexOf("Tuesday, May 20, 2025")
    );
    // 23 before 25, though the rows arrived the other way round
    expect(bodyHtml.indexOf('<td class="cid">23</td>')).toBeLessThan(
      bodyHtml.indexOf('<td class="cid">25</td>')
    );
  });

  it("totals each day off the rows it prints, with the currency", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml).toContain('<td class="lbl">Total Deposit</td>');
    // 33,800 + 14,460 — the unpaid row contributes nothing
    expect(bodyHtml).toContain('<td class="amt">TK. 48,260.00</td>');
    expect(bodyHtml).toContain('<td class="amt">TK. 9,040.00</td>');
  });

  it("heads the name and deposit columns, leaving the ids unheaded", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml).toContain('<th class="cid"></th>');
    expect(bodyHtml).toContain('<th class="name">Customer Name</th>');
    expect(bodyHtml).toContain('<th class="amt">Paid</th>');
  });

  it("takes the column widths off the colgroup", () => {
    const { bodyHtml, styleCss } = buildPaymentReportDocument(report);

    expect(bodyHtml).toContain('<col class="c-cid" />');
    expect(bodyHtml).toContain('<col class="c-amt" />');
    expect(styleCss).toContain("table-layout: fixed");
    expect(styleCss).toContain(".day .c-amt { width: 30%; }");
  });

  it("keeps a day's heading and header band with its rows, and its total with the rows above", () => {
    const { styleCss } = buildPaymentReportDocument(report);

    expect(styleCss).toContain(".day h2 { font-size: 11px");
    expect(styleCss).toContain("break-after: avoid");
    // Without this the paper strands a heading and its column titles at the
    // foot of a column with every row of that day in the next one
    expect(styleCss).toContain(".day thead { break-after: avoid;");
    expect(styleCss).toContain(".day tfoot tr { break-before: avoid;");
  });

  it("shows a customer with no name against their id alone", () => {
    const { bodyHtml } = buildPaymentReportDocument(report);

    expect(bodyHtml).toContain(
      '<td class="cid">220</td>\n            <td class="name"></td>'
    );
  });

  it("escapes a customer name", () => {
    const { bodyHtml } = buildPaymentReportDocument({
      days: [day("19-05-2025", [row({ customerName: "A & <b>", paid: 10 })])],
    });

    expect(bodyHtml).toContain('<td class="name">A &amp; &lt;b&gt;</td>');
  });

  it("localises the currency and the digits", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildPaymentReportDocument(report);

    // Three-digit grouping, not the lakh grouping bn-BD would give
    expect(bodyHtml).toContain('<td class="amt">৩৩,৮০০.০০</td>');
    expect(bodyHtml).toContain("টাকা ৪৮,২৬০.০০");
    // The id follows the language too, ungrouped
    expect(bodyHtml).toContain('<td class="cid">২২০</td>');
    expect(bodyHtml).not.toContain("TK.");
  });

  it("falls back to the empty line when nothing was deposited in the range", () => {
    const { bodyHtml } = buildPaymentReportDocument({ days: [] });

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain("<table>");
  });
});
