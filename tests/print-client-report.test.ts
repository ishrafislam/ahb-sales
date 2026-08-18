import { describe, it, expect, beforeEach } from "vitest";
import { buildClientReportDocument } from "../src/print/clientReport";
import { currentLang } from "../src/i18n";
import type { ClientLedgerReport, ClientLedgerRow } from "../src/main/data";

const RANGE = { from: "2026-05-28", to: "2026-06-27" };

function row(over: Partial<ClientLedgerRow> = {}): ClientLedgerRow {
  return {
    date: "27-06-2026",
    bill: 8220,
    discount: 0,
    netBill: 8220,
    paid: 8220,
    previousDue: 0,
    hasInvoice: true,
    ...over,
  };
}

const report: ClientLedgerReport = {
  clients: [
    {
      customerId: 213,
      customerName: "মুন্না ভাই",
      currentDue: 179608,
      rows: [
        row({ date: "13-06-2026", netBill: 22290, bill: 22290, paid: 23000 }),
        row({ date: "27-06-2026", netBill: 28850, bill: 28850, paid: 26000 }),
      ],
    },
    {
      customerId: 225,
      customerName: "ক্রেতা ২২৫",
      currentDue: 0,
      rows: [row()],
    },
  ],
};

/** Every money cell in document order, tbody then tfoot. */
const amounts = (bodyHtml: string) =>
  bodyHtml.match(/<td class="amt">[^<]*<\/td>/g)!;

describe("buildClientReportDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("is titled the money transaction report", () => {
    const doc = buildClientReportDocument(report, RANGE);

    expect(doc.title).toBe("Money Transaction Report");
    expect(doc.bodyHtml).toContain("<h1>Money Transaction Report :</h1>");
  });

  it("states the range once, in long dates", () => {
    const { bodyHtml } = buildClientReportDocument(report, RANGE);

    expect(bodyHtml).toContain("Between : Thursday, May 28, 2026");
    expect(bodyHtml).toContain("And Saturday, June 27, 2026");
  });

  it("gives a client no heading of its own", () => {
    const { bodyHtml } = buildClientReportDocument(report, RANGE);

    expect(bodyHtml).not.toContain("<h2");
    // The client is named in the total row instead
    expect(bodyHtml).not.toContain('<span class="who">');
  });

  it("prints six columns, dropping the two dues", () => {
    const { bodyHtml, styleCss } = buildClientReportDocument(report, RANGE);

    expect(bodyHtml).toContain('<td class="date">13/06/2026</td>');
    expect(bodyHtml).toContain('<th class="date">Date</th>');
    expect(bodyHtml).toContain('<th class="amt">Total Amount</th>');
    expect(bodyHtml).toContain('<th class="amt">Difference</th>');
    expect(bodyHtml).not.toContain("Previous Due");
    expect(bodyHtml).not.toContain("Next Due");
    // Six headers for each of the two clients
    expect(bodyHtml.match(/<th /g)).toHaveLength(12);
    expect(styleCss).toContain(".client .date { text-align: left; }");
    expect(styleCss).toContain(".client .amt { text-align: right; }");
  });

  it("takes the column widths off the colgroup", () => {
    const { bodyHtml, styleCss } = buildClientReportDocument(report, RANGE);

    expect(bodyHtml).toContain('<col class="c-date" />');
    expect(bodyHtml).toContain('<col class="c-difference" />');
    expect(bodyHtml).not.toContain("c-prev");
    expect(styleCss).toContain("table-layout: fixed");
    expect(styleCss).toContain(".client .c-date { width: 16%; }");
  });

  it("prints a signed difference", () => {
    const { bodyHtml } = buildClientReportDocument(report, RANGE);

    // 22,290 billed against 23,000 deposited
    expect(amounts(bodyHtml).slice(0, 5)).toEqual([
      '<td class="amt">22,290.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">22,290.00</td>',
      '<td class="amt">23,000.00</td>',
      '<td class="amt">-710.00</td>',
    ]);
  });

  it("names the client in the total row instead of labelling it Total", () => {
    const { bodyHtml } = buildClientReportDocument(report, RANGE);
    const foot = bodyHtml.slice(bodyHtml.indexOf("<tfoot>"));

    expect(foot).toContain('<td class="who">213 মুন্না ভাই</td>');
    expect(bodyHtml).not.toContain("Total :");
    expect(amounts(foot).slice(0, 5)).toEqual([
      '<td class="amt">51,140.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">51,140.00</td>',
      '<td class="amt">49,000.00</td>',
      '<td class="amt">2,140.00</td>',
    ]);
  });

  it("closes the block with the current due, under the last two columns", () => {
    const { bodyHtml, styleCss } = buildClientReportDocument(report, RANGE);
    const foot = bodyHtml.slice(bodyHtml.indexOf("<tfoot>"));

    expect(foot).toContain('<tr class="due">');
    expect(foot).toContain('<td colspan="4"></td>');
    expect(foot).toContain('<td class="lbl">Current Due</td>');
    expect(amounts(foot)[5]).toBe('<td class="amt">179,608.00</td>');
    // Reads as a footnote to the block, not another ledger line
    expect(styleCss).toContain(".client tfoot .due td { border-bottom: none;");
  });

  it("prints a deposit-only row like any other", () => {
    const { bodyHtml } = buildClientReportDocument(
      {
        clients: [
          {
            customerId: 1,
            customerName: "Rahim",
            currentDue: 50,
            rows: [row({ bill: 0, netBill: 0, paid: 90, hasInvoice: false })],
          },
        ],
      },
      RANGE
    );

    expect(amounts(bodyHtml).slice(0, 5)).toEqual([
      '<td class="amt">0.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">0.00</td>',
      '<td class="amt">90.00</td>',
      '<td class="amt">-90.00</td>',
    ]);
  });

  it("uses the full page width and rules the table horizontally only", () => {
    const doc = buildClientReportDocument(report, RANGE);

    expect(doc.columns).toBeUndefined();
    expect(doc.styleCss).toContain("border: none; border-bottom: 1px solid");
    expect(doc.styleCss).not.toMatch(/border:\s*1px solid/);
    // Tables break freely across pages
    expect(doc.styleCss).not.toContain("break-inside: avoid");
  });

  it("localises the dates and the amounts", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildClientReportDocument(report, RANGE);

    expect(bodyHtml).not.toContain("13/06/2026");
    expect(bodyHtml).not.toContain("May 28, 2026");
    expect(bodyHtml).toContain("৮,২২০.০০");
  });

  it("escapes a client name", () => {
    const { bodyHtml } = buildClientReportDocument(
      {
        clients: [
          {
            customerId: 1,
            customerName: "A & <b>",
            currentDue: 0,
            rows: [row()],
          },
        ],
      },
      RANGE
    );

    expect(bodyHtml).toContain('<td class="who">1 A &amp; &lt;b&gt;</td>');
  });

  it("falls back to the empty line when nothing happened", () => {
    const { bodyHtml } = buildClientReportDocument({ clients: [] }, RANGE);

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain('class="clients"');
    // The range is still stated
    expect(bodyHtml).toContain("Between :");
  });
});
