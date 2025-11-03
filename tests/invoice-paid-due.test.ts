import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  type AhbDataV1,
} from "../src/main/data";

process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("Invoice paid/due math (Phase 3)", () => {
  it("computes previousDue/currentDue and validates paid", () => {
    const data: AhbDataV1 = initData();
    addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      price: 100,
      stock: 10,
    });
    addCustomer(data, { id: 1, nameBn: "Rahim", outstanding: 50 });

    // net = 100, previousDue = 50
    const inv = postInvoice(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1 }],
      paid: 120, // applies fully to current net first → invoiceDue = 0, previousDue remains 50
    });

    expect(inv.totals.net).toBe(100);
    expect(inv.previousDue).toBe(50);
    expect(inv.paid).toBe(120);
    expect(inv.currentDue).toBe(50);

    // Customer outstanding updated to currentDue
    const cust = data.customers.find((c) => c.id === 1)!;
    expect(cust.outstanding).toBe(50);

    // Paid cannot exceed previousDue + net
    expect(() =>
      postInvoice(data, {
        customerId: 1,
        lines: [{ productId: 1, quantity: 1 }],
        paid: 1000,
      })
    ).toThrow(/cannot exceed previous due plus net bill/);
  });

  it("defaults paid=0 and updates due accordingly", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "Oil",
      unit: "ltr",
      price: 80,
      stock: 5,
    });
    addCustomer(data, { id: 2, nameBn: "Karim", outstanding: 20 });

    const inv = postInvoice(data, {
      customerId: 2,
      lines: [{ productId: 1, quantity: 1 }], // net = 80
    });

    expect(inv.paid).toBe(0);
    expect(inv.previousDue).toBe(20);
    expect(inv.currentDue).toBe(100); // previous 20 + invoiceDue 80
    const cust = data.customers.find((c) => c.id === 2)!;
    expect(cust.outstanding).toBe(100);
  });
});
