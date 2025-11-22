import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  reportMoneyTransactionsCustomerRange,
  reportDailyPayments,
  listProductSales,
  type AhbDataV1,
} from "../src/main/data";

function addSampleProduct(data: AhbDataV1) {
  addProduct(data, {
    id: 1,
    nameBn: "চিনি",
    unit: "kg",
    price: 50,
    stock: 10,
    active: true,
  });
}
function addSampleCustomer(data: AhbDataV1) {
  addCustomer(data, {
    id: 101,
    nameBn: "রহিম",
    phone: "01234",
    address: "Dhaka",
    active: true,
    outstanding: 100,
  });
}

describe("Anonymous (Walk-in) invoice", () => {
  it("posts anonymous invoice only when fully paid and does not touch AR", () => {
    const data = initData();
    addSampleProduct(data);
    const inv = postInvoice(data, {
      customerId: null,
      lines: [{ productId: 1, quantity: 2 }], // 2 * 50 = 100
      discount: 10, // net = 90
      paid: 90,
      notes: "walk-in sale",
    });
    expect(inv.customerId).toBeNull();
    expect(inv.totals.net).toBe(90);
    expect(inv.paid).toBe(90);
    expect(inv.previousDue).toBe(0);
    expect(inv.currentDue).toBe(0);
    // stock reduced
    const saleLines = listProductSales(data, 1);
    expect(saleLines.length).toBe(1);
    expect(saleLines[0]?.quantity).toBe(2);
    // no customers in data, AR unaffected
    expect(data.customers.length).toBe(0);
  });

  it("rejects anonymous invoice when not fully paid", () => {
    const data = initData();
    addSampleProduct(data);
    expect(() =>
      postInvoice(data, {
        customerId: null,
        lines: [{ productId: 1, quantity: 1 }], // 50
        paid: 49, // not equal to net
      })
    ).toThrowError(/fully paid/i);
  });

  it("includes anonymous in money customer range and daily payments with customerId 0", () => {
    const data = initData();
    addSampleProduct(data);
    // Also add a normal customer and invoice
    addSampleCustomer(data);
    postInvoice(data, {
      customerId: 101,
      lines: [{ productId: 1, quantity: 1 }],
      paid: 0,
    });
    // Walk-in invoice
    postInvoice(data, {
      customerId: null,
      lines: [{ productId: 1, quantity: 2 }],
      paid: 100,
    });

    const today = new Date().toISOString().slice(0, 10);
    const custRange = reportMoneyTransactionsCustomerRange(data, today, today);
    const hasAnon = custRange.rows.some((r) => r.customerId === 0);
    expect(hasAnon).toBe(true);

    const daily = reportDailyPayments(data, today);
    const anonPayRows = daily.rows.filter((r) => r.customerId === 0);
    // walk-in invoice paid 100 today
    expect(anonPayRows.reduce((s, r) => s + r.paid, 0)).toBeGreaterThan(0);
  });
});
