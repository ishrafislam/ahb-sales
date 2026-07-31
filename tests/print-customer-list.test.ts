import { describe, it, expect, beforeEach } from "vitest";
import { buildCustomerListDocument } from "../src/print/customerList";
import { currentLang } from "../src/i18n";
import type { Customer } from "../src/main/data";

function customer(over: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    nameBn: "রোজা এন্টারপ্রাইজ",
    outstanding: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const customers: Customer[] = [
  customer({ id: 1, outstanding: -10 }),
  customer({ id: 7, nameBn: "বোখে বেকারী", outstanding: 101013 }),
  customer({ id: 32, nameBn: "সুমি আইসক্রিম", outstanding: 0 }),
];

describe("buildCustomerListDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("is the customer list, flowing down one half of the page then the other", () => {
    const doc = buildCustomerListDocument(customers);

    expect(doc.title).toBe("Customer List");
    expect(doc.bodyHtml).toContain("<h1>Customer List :</h1>");
    expect(doc.columns).toBe(2);
    // The heading belongs to the page, not the left column
    expect(doc.styleCss).toContain("column-span: all");
  });

  it("prints id, name and due for each customer, in the order given", () => {
    const { bodyHtml } = buildCustomerListDocument(customers);

    expect(bodyHtml).toContain('<td class="id">7</td>');
    expect(bodyHtml).toContain('<td class="name">বোখে বেকারী</td>');
    expect(bodyHtml).toContain('<td class="due">TK. 101,013.00</td>');
    expect(bodyHtml.indexOf('<td class="id">1</td>')).toBeLessThan(
      bodyHtml.indexOf('<td class="id">32</td>')
    );
  });

  it("ranges the due right, sign and all", () => {
    const { bodyHtml, styleCss } = buildCustomerListDocument(customers);

    expect(bodyHtml).toContain('<td class="due">-TK. 10.00</td>');
    expect(bodyHtml).toContain('<td class="due">TK. 0.00</td>');
    expect(styleCss).toContain(".due { text-align: right;");
  });

    it("heads the three columns, the due over its figures", () => {
    const { bodyHtml } = buildCustomerListDocument(customers);

    expect(bodyHtml).toContain('<th class="id">ID</th>');
    expect(bodyHtml).toContain('<th class="name">Name</th>');
    // The due header ranges right with the figures under it
    expect(bodyHtml).toContain('<th class="due">Due</th>');
    expect(bodyHtml.match(/<th /g)).toHaveLength(3);
  });

  it("takes the column widths off the colgroup", () => {
    const { bodyHtml, styleCss } = buildCustomerListDocument(customers);

    expect(bodyHtml).toContain('<col class="c-id" />');
    expect(bodyHtml).toContain('<col class="c-due" />');
    expect(styleCss).toContain("table-layout: fixed");
    expect(styleCss).toContain(".c-due { width: 36%; }");
  });

  it("rules the header band only, leaving the rows unruled", () => {
    const { styleCss } = buildCustomerListDocument(customers);

    expect(styleCss).toContain("th, td { border: none;");
    expect(styleCss).toContain(
      "border-top: 1px solid #999; border-bottom: 1px solid #999; }"
    );
  });

  it("still shows a slot that was never given a name", () => {
    const { bodyHtml } = buildCustomerListDocument([
      customer({ id: 19, nameBn: "" }),
    ]);

    expect(bodyHtml).toContain('<td class="id">19</td>');
    expect(bodyHtml).toContain('<td class="name"></td>');
  });

  it("escapes a customer name", () => {
    const { bodyHtml } = buildCustomerListDocument([
      customer({ nameBn: "A & <b>" }),
    ]);

    expect(bodyHtml).toContain('<td class="name">A &amp; &lt;b&gt;</td>');
  });

  it("localises the currency and the digits", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildCustomerListDocument(customers);

    // Three-digit grouping, not the lakh grouping bn-BD would give
    expect(bodyHtml).toContain("টাকা ১০১,০১৩.০০");
    expect(bodyHtml).not.toContain("TK.");
  });

  it("falls back to the empty line when there are no customers", () => {
    const { bodyHtml } = buildCustomerListDocument([]);

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain("<table>");
  });
});
