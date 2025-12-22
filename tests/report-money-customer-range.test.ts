import { describe, it, expect } from "vitest";
import {
  initData,
  addCustomer,
  addProduct,
  postInvoice,
  type AhbDataV1,
  reportMoneyTransactionsCustomerRange,
} from "../src/main/data";

function setupData(): AhbDataV1 {
  const data = initData();
  // Customers
  addCustomer(data, { id: 1, nameBn: "Rahim" });
  addCustomer(data, { id: 2, nameBn: "Karim" });
  // Products with ample stock
  addProduct(data, {
    id: 10,
    nameBn: "Sugar",
    unit: "kg",
    price: 100,
    stock: 100,
  });
  addProduct(data, {
    id: 11,
    nameBn: "Rice",
    unit: "kg",
    price: 50,
    stock: 100,
  });

  // Invoices in range
  postInvoice(data, {
    date: "2025-01-02T08:00:00.000Z",
    customerId: 1,
    lines: [
      { productId: 10, quantity: 1, rate: 100 },
      { productId: 11, quantity: 2, rate: 50 },
    ],
    discount: 0,
    paid: 120, // net 200, due 80
  });
  // Another invoice same day, same customer
  postInvoice(data, {
    date: "2025-01-02T12:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 1, rate: 100 }],
    discount: 0,
    paid: 50, // net 100, due 50
  });
  // Different customer next day
  postInvoice(data, {
    date: "2025-01-03T10:00:00.000Z",
    customerId: 2,
    lines: [{ productId: 11, quantity: 3, rate: 50 }],
    discount: 0,
    paid: 150, // net 150, due 0
  });

  return data;
}

describe("reportMoneyTransactionsCustomerRange", () => {
  it("aggregates rows per invoice with DD-MM-YYYY dates and computes totals", () => {
    const data = setupData();
    const rep = reportMoneyTransactionsCustomerRange(
      data,
      "2025-01-01",
      "2025-01-03"
    );
    // Expect 3 invoices in range
    expect(rep.rows.length).toBe(3);

    // Dates formatted DD-MM-YYYY (descending by date)
    expect(rep.rows[0]?.date).toMatch(/^\d{2}-\d{2}-\d{4}$/);

    // Check one known row values
    const rowRahim1 = rep.rows.find(
      (r) => r.customerId === 1 && r.netBill === 200
    );
    expect(rowRahim1).toBeTruthy();
    expect(rowRahim1!.paid).toBe(120);
    expect(rowRahim1!.due).toBe(80);
    expect(rowRahim1!.totalDue).toBe(rowRahim1!.previousDue + rowRahim1!.due);

    // Totals
    const totalNet = rep.rows.reduce((s, r) => s + r.netBill, 0);
    const totalPaid = rep.rows.reduce((s, r) => s + r.paid, 0);
    const totalDue = rep.rows.reduce((s, r) => s + r.due, 0);

    expect(rep.totals.netBill).toBeGreaterThan(0);
    expect(rep.totals.netBill).toBeCloseTo(totalNet, 6);
    expect(rep.totals.paid).toBeCloseTo(totalPaid, 6);
    expect(rep.totals.due).toBeCloseTo(totalDue, 6);
  });

  it("respects inclusive range and returns empty when no matches", () => {
    const data = setupData();
    const rep = reportMoneyTransactionsCustomerRange(
      data,
      "2025-01-04",
      "2025-01-04"
    );
    expect(rep.rows.length).toBe(0);
    expect(rep.totals).toEqual({ netBill: 0, paid: 0, due: 0 });
  });
});
