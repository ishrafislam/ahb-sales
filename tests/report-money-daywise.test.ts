import { describe, it, expect } from "vitest";
import {
  initData,
  addCustomer,
  addProduct,
  postInvoice,
  type AhbDataV1,
  reportMoneyTransactionsDayWise,
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

  // Day 1: two invoices for Rahim
  postInvoice(data, {
    date: "2025-01-02T08:00:00.000Z",
    customerId: 1,
    lines: [
      { productId: 10, quantity: 1, rate: 100 },
      { productId: 11, quantity: 2, rate: 50 },
    ],
    discount: 10, // subtotal 200, net 190
    paid: 100, // due 90
  });
  postInvoice(data, {
    date: "2025-01-02T12:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 1, rate: 100 }],
    discount: 0, // net 100
    paid: 50, // due 50
  });

  // Day 2: one invoice for Karim
  postInvoice(data, {
    date: "2025-01-03T10:00:00.000Z",
    customerId: 2,
    lines: [{ productId: 11, quantity: 3, rate: 50 }],
    discount: 0, // net 150
    paid: 150,
  });

  return data;
}

describe("reportMoneyTransactionsDayWise", () => {
  it("groups by date and aggregates per customer with DD-MM-YYYY dates", () => {
    const data = setupData();
    const rep = reportMoneyTransactionsDayWise(
      data,
      "2025-01-01",
      "2025-01-03"
    );
    // Should have 2 days
    expect(rep.days.length).toBe(2);

    // Dates in DD-MM-YYYY
    rep.days.forEach((d) => expect(d.date).toMatch(/^\d{2}-\d{2}-\d{4}$/));

    // Day 2025-01-02 for Rahim -> bill 300 (200 + 100), discount 10, net 290, paid 150, due 140
    const day1 = rep.days.find((d) => d.date === "02-01-2025");
    expect(day1).toBeTruthy();
    const r = day1!.rows.find((x) => x.customerId === 1)!;
    expect(r.bill).toBe(300);
    expect(r.discount).toBe(10);
    expect(r.netBill).toBe(290);
    expect(r.paid).toBe(150);
    expect(r.due).toBe(140);
    expect(r.totalDue).toBe(r.previousDue + r.due);

    // Day totals match sum of rows
    const sumDay1 = day1!.rows.reduce(
      (t, x) => ({
        bill: t.bill + x.bill,
        discount: t.discount + x.discount,
        netBill: t.netBill + x.netBill,
        paid: t.paid + x.paid,
        due: t.due + x.due,
      }),
      { bill: 0, discount: 0, netBill: 0, paid: 0, due: 0 }
    );
    expect(day1!.totals.bill).toBe(sumDay1.bill);
    expect(day1!.totals.discount).toBe(sumDay1.discount);
    expect(day1!.totals.netBill).toBe(sumDay1.netBill);
    expect(day1!.totals.paid).toBe(sumDay1.paid);
    expect(day1!.totals.due).toBe(sumDay1.due);

    // Day 2025-01-03 for Karim -> bill 150, discount 0, net 150, paid 150, due 0
    const day2 = rep.days.find((d) => d.date === "03-01-2025");
    const k = day2!.rows.find((x) => x.customerId === 2)!;
    expect(k.bill).toBe(150);
    expect(k.discount).toBe(0);
    expect(k.netBill).toBe(150);
    expect(k.paid).toBe(150);
    expect(k.due).toBe(0);
  });

  it("returns empty when no invoices in range", () => {
    const data = setupData();
    const rep = reportMoneyTransactionsDayWise(
      data,
      "2025-01-05",
      "2025-01-06"
    );
    expect(rep.days.length).toBe(0);
  });
});
