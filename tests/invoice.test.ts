import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  type AhbDataV1,
} from "../src/main/data";

// Ensure tests run with deterministic environment when needed
process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function isoLike(s: string) {
  // Basic ISO string validation (YYYY-MM-DDT...Z)
  return /\d{4}-\d{2}-\d{2}T/.test(s);
}

describe("postInvoice (Phase 2)", () => {
  it("posts invoice, computes totals, trims notes, and updates stock", () => {
    const data: AhbDataV1 = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 60,
      stock: 10,
    });
    addProduct(data, { id: 2, nameBn: "নুন", unit: "kg", price: 30, stock: 5 });
    addCustomer(data, { id: 101, nameBn: "Rahim" });

    const inv = postInvoice(data, {
      date: "2025-10-10T12:00:00.000Z",
      customerId: 101,
      lines: [
        { productId: 1, quantity: 2 }, // default rate from product (60)
        { productId: 2, quantity: 5, rate: 25 }, // override rate
      ],
      discount: 10,
      notes: "  First invoice  ",
    });

    // Basic shape
    expect(inv.id).toBeTypeOf("string");
    expect(inv.no).toBe(1);
    expect(inv.status).toBe("posted");
    expect(isoLike(inv.createdAt)).toBe(true);
    expect(isoLike(inv.updatedAt)).toBe(true);

    // Lines & math
    expect(inv.lines.length).toBe(2);
    expect(inv.lines[0]).toMatchObject({ productId: 1, quantity: 2, rate: 60 });
    expect(inv.lines[1]).toMatchObject({ productId: 2, quantity: 5, rate: 25 });
    expect(inv.totals.subtotal).toBe(245); // 2*60 + 5*25 = 120 + 125
    expect(inv.discount).toBe(10);
    expect(inv.totals.net).toBe(235);
    expect(inv.notes).toBe("First invoice");

    // Stock updated
    const p1 = data.products.find((p) => p.id === 1)!;
    const p2 = data.products.find((p) => p.id === 2)!;
    expect(p1.stock).toBe(8);
    expect(p2.stock).toBe(0);

    // Invoice sequence increments
    expect(data.invoiceSeq).toBe(2);
    expect(data.invoices.length).toBe(1);
  });

  it("applies ceil-to-2 rounding on line totals and subtotal", () => {
    const data = initData();
    addProduct(data, {
      id: 3,
      nameBn: "ডাল",
      unit: "kg",
      price: 19.331,
      stock: 10,
    });
    addCustomer(data, { id: 1, nameBn: "Cust" });

    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 3, quantity: 3 }], // line: 3 * 19.331 = 57.993 -> ceil2 => 58.00
    });

    expect(inv.lines[0].lineTotal).toBe(58);
    expect(inv.totals.subtotal).toBe(58);
    expect(inv.totals.net).toBe(58);
  });

  it("rejects invalid date", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 10,
      stock: 10,
    });
    addCustomer(data, { id: 1, nameBn: "C" });
    expect(() =>
      postInvoice(data, {
        date: "not-a-date",
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }],
      })
    ).toThrow(/Invalid date/);
  });

  it("rejects when discount exceeds subtotal or is negative", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 50,
      stock: 10,
    });
    addCustomer(data, { id: 1, nameBn: "C" });

    // Negative discount
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }],
        discount: -1,
      })
    ).toThrow(/non-negative/);

    // Exceeds subtotal
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }],
        discount: 60, // subtotal would be 50
      })
    ).toThrow(/exceed subtotal/);
  });

  it("rejects insufficient stock and invalid quantities/rates", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 10,
      stock: 1,
    });
    addCustomer(data, { id: 1, nameBn: "C" });

    // Insufficient stock
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 2 }],
      })
    ).toThrow(/Insufficient stock/);

    // Invalid quantity
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 0 }],
      })
    ).toThrow(/Quantity must be > 0/);

    // Negative rate override
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1, rate: -1 }],
      })
    ).toThrow(/Rate must be >= 0/);
  });

  it("uses product unit, assigns serial numbers, and supports custom rate", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "Oil",
      unit: "ltr",
      price: 100,
      stock: 10,
    });
    addProduct(data, {
      id: 2,
      nameBn: "Soap",
      unit: "pc",
      price: 25,
      stock: 10,
    });
    addCustomer(data, { id: 5, nameBn: "Buyer" });

    const inv = postInvoice(data, {
      customerId: 5,
      lines: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2, rate: 20 },
      ],
    });

    expect(inv.lines[0]).toMatchObject({ sn: 1, unit: "ltr", rate: 100 });
    expect(inv.lines[1]).toMatchObject({ sn: 2, unit: "pc", rate: 20 });
  });

  it("increments invoice numbers across multiple posts", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 10,
      stock: 10,
    });
    addCustomer(data, { id: 9, nameBn: "Buyer" });

    const inv1 = postInvoice(data, {
      customerId: 9,
      lines: [{ productId: 1, quantity: 1 }],
    });
    const inv2 = postInvoice(data, {
      customerId: 9,
      lines: [{ productId: 1, quantity: 1 }],
    });

    expect(inv1.no).toBe(1);
    expect(inv2.no).toBe(2);
    expect(data.invoiceSeq).toBe(3);
    expect(data.invoices.length).toBe(2);
  });
});
