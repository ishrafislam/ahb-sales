import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  updateInvoice,
  type AhbDataV1,
} from "../src/main/data";

process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function setup() {
  const data: AhbDataV1 = initData();
  addProduct(data, { id: 1, nameBn: "চিনি", unit: "kg", price: 100, stock: 10 });
  addProduct(data, { id: 2, nameBn: "Oil", unit: "ltr", price: 80, stock: 5 });
  addCustomer(data, { id: 1, nameBn: "Rahim", outstanding: 50 });
  return data;
}

describe("updateInvoice", () => {
  it("updates lines/discount/paid/notes in place, keeping id/no/previousDue", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // subtotal 200
      discount: 10,
      paid: 40,
      notes: "original",
    });
    expect(inv.currentDue).toBe(50 + 150); // previousDue 50 + (190 - 40)

    const updated = updateInvoice(data, inv.id, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 5, rate: 90 }], // subtotal 450
      discount: 50,
      paid: 100,
      notes: "amended",
    });

    expect(updated.id).toBe(inv.id);
    expect(updated.no).toBe(inv.no);
    expect(updated.previousDue).toBe(50);
    expect(updated.totals.subtotal).toBe(450);
    expect(updated.totals.net).toBe(400);
    expect(updated.paid).toBe(100);
    expect(updated.currentDue).toBe(50 + 300);
    expect(updated.notes).toBe("amended");
    expect(data.invoices).toHaveLength(1);
  });

  it("reverts and re-applies stock, including product swaps", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }],
    });
    expect(data.products.find((p) => p.id === 1)!.stock).toBe(8);

    updateInvoice(data, inv.id, {
      customerId: 1,
      lines: [
        { productId: 1, quantity: 5 },
        { productId: 2, quantity: 1 },
      ],
    });
    // Product 1: 10 - 5; product 2: 5 - 1
    expect(data.products.find((p) => p.id === 1)!.stock).toBe(5);
    expect(data.products.find((p) => p.id === 2)!.stock).toBe(4);

    // Swap away from product 1 entirely
    const again = data.invoices!.find((i) => i.id === inv.id)!;
    updateInvoice(data, again.id, {
      customerId: 1,
      lines: [{ productId: 2, quantity: 2 }],
    });
    expect(data.products.find((p) => p.id === 1)!.stock).toBe(10);
    expect(data.products.find((p) => p.id === 2)!.stock).toBe(3);
  });

  it("recomputes customer outstanding from the stored previousDue", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }], // net 100
    });
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(150);

    updateInvoice(data, inv.id, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
      paid: 100,
    });
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(50);
  });

  it("throws for an unknown invoice id", () => {
    const data = setup();
    expect(() =>
      updateInvoice(data, "missing", {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }],
      })
    ).toThrow(/Invoice not found/);
  });

  it("only allows editing the customer's latest invoice", () => {
    const data = setup();
    const first = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
    });
    postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 2, quantity: 1 }],
    });

    expect(() =>
      updateInvoice(data, first.id, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 2 }],
      })
    ).toThrow(/Only the latest invoice can be edited/);
  });

  it("leaves state untouched when validation fails", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // subtotal 200
    });
    const stockBefore = data.products.find((p) => p.id === 1)!.stock;
    const outstandingBefore = data.customers.find((c) => c.id === 1)!
      .outstanding;

    expect(() =>
      updateInvoice(data, inv.id, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }], // subtotal 100
        discount: 500,
      })
    ).toThrow(/Discount cannot exceed subtotal/);

    expect(data.products.find((p) => p.id === 1)!.stock).toBe(stockBefore);
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(
      outstandingBefore
    );
    expect(data.invoices!.find((i) => i.id === inv.id)!.totals.subtotal).toBe(
      200
    );
  });
});
