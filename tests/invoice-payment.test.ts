import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  updateInvoice,
  addInvoicePayment,
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

describe("addInvoicePayment", () => {
  it("accumulates paid, stores the payment and updates dues", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // net 200, previousDue 50
    });
    expect(inv.currentDue).toBe(250);

    const updated = addInvoicePayment(data, inv.id, {
      amount: 60,
      notes: "first payment",
    });
    expect(updated.paid).toBe(60);
    expect(updated.currentDue).toBe(190); // 50 + 200 - 60
    expect(updated.payments).toHaveLength(1);
    expect(updated.payments![0]!.amount).toBe(60);
    expect(updated.payments![0]!.notes).toBe("first payment");
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(190);

    const again = addInvoicePayment(data, inv.id, { amount: 40 });
    expect(again.paid).toBe(100);
    expect(again.currentDue).toBe(150);
    expect(again.payments).toHaveLength(2);
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(150);
  });

  it("allows overpayment, producing a negative due (customer credit)", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }], // net 100, previousDue 50
    });

    const updated = addInvoicePayment(data, inv.id, { amount: 200 });
    expect(updated.paid).toBe(200);
    expect(updated.currentDue).toBe(-50); // 50 + 100 - 200
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(-50);
  });

  it("rejects non-positive amounts", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
    });
    expect(() => addInvoicePayment(data, inv.id, { amount: 0 })).toThrow(
      /Payment amount must be positive/
    );
    expect(() => addInvoicePayment(data, inv.id, { amount: -5 })).toThrow(
      /Payment amount must be positive/
    );
    expect(data.invoices!.find((i) => i.id === inv.id)!.paid).toBe(0);
  });

  it("throws for an unknown invoice id", () => {
    const data = setup();
    expect(() => addInvoicePayment(data, "missing", { amount: 10 })).toThrow(
      /Invoice not found/
    );
  });

  it("only allows payments on the customer's latest invoice", () => {
    const data = setup();
    const first = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
    });
    postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 2, quantity: 1 }],
    });
    expect(() => addInvoicePayment(data, first.id, { amount: 10 })).toThrow(
      /Only the latest invoice can receive payments/
    );
  });

  it("editing an overpaid invoice keeps working (allowOverpay)", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // net 200
    });
    addInvoicePayment(data, inv.id, { amount: 300 }); // > new net below

    const updated = updateInvoice(data, inv.id, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }], // net 100
      paid: 300,
    });
    expect(updated.paid).toBe(300);
    expect(updated.currentDue).toBe(-150); // 50 + 100 - 300
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(-150);
  });
});
