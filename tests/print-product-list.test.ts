import { describe, it, expect, beforeEach } from "vitest";
import { buildProductListDocument } from "../src/print/productList";
import { digits, quantity } from "../src/print/format";
import { currentLang } from "../src/i18n";
import type { Product } from "../src/main/data";

function product(over: Partial<Product> = {}): Product {
  return {
    id: 2,
    nameBn: "ফেনাও ইষ্ট",
    unit: "কার্টুন",
    price: 100,
    stock: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const products: Product[] = [
  product({ id: 2, stock: -1 }),
  product({ id: 10, nameBn: "চানা অরেঞ্জ ট্যাক", unit: "পেকেট", stock: 6 }),
  product({ id: 33, nameBn: "কেক জেল", unit: "কেজি", stock: 1500 }),
];

describe("buildProductListDocument", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("is the product list, flowing down one half of the page then the other", () => {
    const doc = buildProductListDocument(products);

    expect(doc.title).toBe("Product List");
    expect(doc.bodyHtml).toContain("<h1>Product List :</h1>");
    expect(doc.columns).toBe(2);
    // The heading belongs to the page, not the left column
    expect(doc.styleCss).toContain("column-span: all");
  });

  it("prints id, name, stock and unit in the order given", () => {
    const { bodyHtml } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<td class="id">10</td>');
    expect(bodyHtml).toContain('<td class="name">চানা অরেঞ্জ ট্যাক</td>');
    expect(bodyHtml).toContain('<td class="stock">6</td>');
    expect(bodyHtml).toContain('<td class="unit">পেকেট</td>');
    expect(bodyHtml.indexOf('<td class="id">2</td>')).toBeLessThan(
      bodyHtml.indexOf('<td class="id">33</td>')
    );
  });

  it("ranges the stock right and its unit left", () => {
    const { styleCss } = buildProductListDocument(products);

    // The figures end on a common vertical however long the unit reads
    expect(styleCss).toContain(".stock { text-align: right;");
    expect(styleCss).toContain(".unit { text-align: left;");
  });

  it("heads the unit column, leaving the stock figures unheaded", () => {
    const { bodyHtml } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<th class="id">ID</th>');
    expect(bodyHtml).toContain('<th class="name">Name</th>');
    expect(bodyHtml).toContain('<th class="stock"></th>');
    expect(bodyHtml).toContain('<th class="unit">Current Stock</th>');
    expect(bodyHtml.match(/<th /g)).toHaveLength(4);
  });

  it("takes the column widths off the colgroup", () => {
    const { bodyHtml, styleCss } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<col class="c-stock" />');
    expect(bodyHtml).toContain('<col class="c-unit" />');
    expect(styleCss).toContain("table-layout: fixed");
    expect(styleCss).toContain(".c-stock { width: 15%; }");
  });

  it("rules the header band only, leaving the rows unruled", () => {
    const { styleCss } = buildProductListDocument(products);

    expect(styleCss).toContain("th, td { border: none;");
    expect(styleCss).toContain(
      "border-top: 1px solid #999; border-bottom: 1px solid #999; }"
    );
  });

  it("prints a negative stock with its minus", () => {
    const { bodyHtml } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<td class="stock">-1</td>');
  });

  it("groups a large stock without forcing decimals", () => {
    const { bodyHtml } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<td class="stock">1,500</td>');
    expect(bodyHtml).not.toContain("1,500.00");
  });

  it("still shows a slot that was never given a name", () => {
    const { bodyHtml } = buildProductListDocument([
      product({ id: 7, nameBn: "", unit: "" }),
    ]);

    expect(bodyHtml).toContain('<td class="id">7</td>');
    expect(bodyHtml).toContain('<td class="name"></td>');
    expect(bodyHtml).toContain('<td class="unit"></td>');
  });

  it("escapes a product name and its unit", () => {
    const { bodyHtml } = buildProductListDocument([
      product({ nameBn: "A & <b>", unit: "<kg>" }),
    ]);

    expect(bodyHtml).toContain('<td class="name">A &amp; &lt;b&gt;</td>');
    expect(bodyHtml).toContain('<td class="unit">&lt;kg&gt;</td>');
  });

  it("localises the digits", () => {
    currentLang.value = "bn";
    const { bodyHtml } = buildProductListDocument(products);

    expect(bodyHtml).toContain('<td class="stock">১,৫০০</td>');
    expect(bodyHtml).toContain('<td class="stock">-১</td>');
    // The id follows too, ungrouped: slot 33, not "৩৩" thousands
    expect(bodyHtml).toContain('<td class="id">৩৩</td>');
  });

  it("falls back to the empty line when there are no products", () => {
    const { bodyHtml } = buildProductListDocument([]);

    expect(bodyHtml).toContain("No records");
    expect(bodyHtml).not.toContain("<table>");
  });
});

describe("digits", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("leaves Latin digits alone", () => {
    expect(digits(1000)).toBe("1000");
  });

  it("transliterates without grouping under Bengali", () => {
    currentLang.value = "bn";
    // Grouped, "১,০০০" would read as a thousand rather than as slot 1000
    expect(digits(1000)).toBe("১০০০");
  });
});

describe("quantity", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("groups in threes and forces no decimals", () => {
    expect(quantity(6)).toBe("6");
    expect(quantity(1500)).toBe("1,500");
    expect(quantity(0)).toBe("0");
  });

  it("keeps up to two decimals for a fractional count", () => {
    expect(quantity(2.5)).toBe("2.5");
    expect(quantity(2.567)).toBe("2.57");
  });

  it("transliterates under Bengali, grouping in threes still", () => {
    currentLang.value = "bn";
    expect(quantity(101013)).toBe("১০১,০১৩");
    expect(quantity(2.5)).toBe("২.৫");
  });

  it("treats an unusable figure as zero", () => {
    expect(quantity(Number.NaN)).toBe("0");
  });
});
