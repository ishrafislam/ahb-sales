import { describe, it, expect } from "vitest";
import {
  initData,
  addCustomer,
  addProduct,
  postInvoice,
  type AhbDataV1,
  reportDailyPayments,
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

  // Target day: 2025-01-05
  postInvoice(data, {
    date: "2025-01-05T08:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 1, rate: 100 }],
    discount: 0,
    paid: 100,
  });
  postInvoice(data, {
    date: "2025-01-05T11:00:00.000Z",
    customerId: 2,
    lines: [{ productId: 11, quantity: 2, rate: 50 }], // net 100
    discount: 0,
    paid: 60,
  });
  // Another day: should be ignored
  postInvoice(data, {
    date: "2025-01-06T09:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 1, rate: 100 }],
    discount: 0,
    paid: 100,
  });
  // Zero paid on the target day: should be omitted
  postInvoice(data, {
    date: "2025-01-05T15:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 11, quantity: 1, rate: 50 }],
    discount: 0,
    paid: 0,
  });

  return data;
}

describe("reportDailyPayments", () => {
  it("lists payments for a given date with DD-MM-YYYY header and totals", () => {
    const data = setupData();
    const rep = reportDailyPayments(data, "2025-01-05");
    // Header format
    expect(rep.header.date).toBe("05-01-2025");
    // Two paid rows for the target date
    expect(rep.rows.length).toBe(2);
    // Names included
    expect(rep.rows.some((r) => r.customerName === "Rahim")).toBe(true);
    expect(rep.rows.some((r) => r.customerName === "Karim")).toBe(true);
    // Totals
    const sum = rep.rows.reduce((s, r) => s + r.paid, 0);
    expect(rep.totals.paid).toBe(sum);
  });

  it("returns empty when no payments on the date", () => {
    const data = setupData();
    const rep = reportDailyPayments(data, "2025-01-07");
    expect(rep.rows.length).toBe(0);
    expect(rep.totals.paid).toBe(0);
  });
});
