import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  updateInvoice,
  addInvoicePayment,
  updateInvoicePayment,
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
  it("keeps a single payment record that accumulates and updates dues", () => {
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

    // A second payment merges into the same record: amounts summed,
    // notes kept when the new payment has none
    const again = addInvoicePayment(data, inv.id, { amount: 40 });
    expect(again.paid).toBe(100);
    expect(again.currentDue).toBe(150);
    expect(again.payments).toHaveLength(1);
    expect(again.payments![0]!.amount).toBe(100);
    expect(again.payments![0]!.notes).toBe("first payment");
    expect(again.payments![0]!.id).toBe(updated.payments![0]!.id);
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(150);

    // New notes replace the old ones
    const third = addInvoicePayment(data, inv.id, {
      amount: 10,
      notes: "adjusted",
    });
    expect(third.payments![0]!.notes).toBe("adjusted");
    expect(third.paid).toBe(110);
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

  it("updateInvoicePayment replaces the amount and notes, keeping the date", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // net 200, previousDue 50
    });
    const withPayment = addInvoicePayment(data, inv.id, {
      amount: 80,
      notes: "original",
    });
    const original = withPayment.payments![0]!;

    const updated = updateInvoicePayment(data, inv.id, {
      amount: 30,
      notes: "corrected",
    });
    expect(updated.paid).toBe(30);
    expect(updated.currentDue).toBe(220); // 50 + 200 - 30
    expect(updated.payments).toHaveLength(1);
    expect(updated.payments![0]!.amount).toBe(30);
    expect(updated.payments![0]!.notes).toBe("corrected");
    expect(updated.payments![0]!.id).toBe(original.id);
    expect(updated.payments![0]!.date).toBe(original.date);
    expect(updated.payments![0]!.createdAt).toBe(original.createdAt);
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(220);
  });

  it("updateInvoicePayment with 0 removes the payment", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 2 }], // net 200, previousDue 50
    });
    addInvoicePayment(data, inv.id, { amount: 80, notes: "mistake" });

    const cleared = updateInvoicePayment(data, inv.id, { amount: 0 });
    expect(cleared.paid).toBe(0);
    expect(cleared.payments).toEqual([]);
    expect(cleared.currentDue).toBe(250); // 50 + 200
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(250);

    // The record is gone, so there is nothing left to edit
    expect(() =>
      updateInvoicePayment(data, inv.id, { amount: 10 })
    ).toThrow(/Invoice has no payment to edit/);
  });

  it("updateInvoicePayment validates and guards like adding", () => {
    const data = setup();
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
    });

    // No payment yet
    expect(() =>
      updateInvoicePayment(data, inv.id, { amount: 10 })
    ).toThrow(/Invoice has no payment to edit/);

    addInvoicePayment(data, inv.id, { amount: 20 });
    expect(() =>
      updateInvoicePayment(data, inv.id, { amount: -5 })
    ).toThrow(/Payment amount must be positive/);
    expect(() =>
      updateInvoicePayment(data, "missing", { amount: 10 })
    ).toThrow(/Invoice not found/);

    postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 2, quantity: 1 }],
    });
    expect(() =>
      updateInvoicePayment(data, inv.id, { amount: 10 })
    ).toThrow(/Only the latest invoice can receive payments/);
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
