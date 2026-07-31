import { describe, it, expect } from "vitest";
import {
  initData,
  addCustomer,
  addProduct,
  postInvoice,
  recordPayment,
  reportClientLedger,
  type AhbDataV1,
} from "../src/main/data";

function setupData(): AhbDataV1 {
  const data = initData();
  addCustomer(data, { id: 1, nameBn: "Rahim" });
  addCustomer(data, { id: 2, nameBn: "Karim" });
  addProduct(data, {
    id: 10,
    nameBn: "Sugar",
    unit: "kg",
    price: 100,
    stock: 100,
  });

  // Rahim: two invoices, the later one first in insertion order
  postInvoice(data, {
    date: "2025-01-03T10:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 2, rate: 100 }],
    discount: 0, // net 200
    paid: 50,
  });
  postInvoice(data, {
    date: "2025-01-02T08:00:00.000Z",
    customerId: 1,
    lines: [{ productId: 10, quantity: 1, rate: 100 }],
    discount: 10, // subtotal 100, net 90
    paid: 90,
  });

  // Karim: one invoice
  postInvoice(data, {
    date: "2025-01-02T12:00:00.000Z",
    customerId: 2,
    lines: [{ productId: 10, quantity: 3, rate: 100 }],
    discount: 0, // net 300
    paid: 300,
  });

  return data;
}

describe("reportClientLedger", () => {
  it("groups by client, ordered by id, with rows oldest first", () => {
    const rep = reportClientLedger(setupData(), "2025-01-01", "2025-01-05");

    expect(rep.clients.map((c) => c.customerId)).toEqual([1, 2]);
    expect(rep.clients[0]!.customerName).toBe("Rahim");
    expect(rep.clients[0]!.rows.map((r) => r.date)).toEqual([
      "02-01-2025",
      "03-01-2025",
    ]);
  });

  it("carries the subtotal and discount of each invoice", () => {
    const rep = reportClientLedger(setupData(), "2025-01-01", "2025-01-05");
    const first = rep.clients[0]!.rows[0]!;

    expect(first.bill).toBe(100);
    expect(first.discount).toBe(10);
    expect(first.netBill).toBe(90);
    expect(first.paid).toBe(90);
    expect(first.hasInvoice).toBe(true);
  });

  it("reports the customer's outstanding as the current due", () => {
    const data = setupData();
    const rep = reportClientLedger(data, "2025-01-01", "2025-01-05");

    expect(rep.clients[0]!.currentDue).toBe(
      data.customers.find((c) => c.id === 1)!.outstanding
    );
  });

  it("gives a standalone deposit a row of its own", () => {
    const data = setupData();
    // Rahim owes 150 from the second invoice and pays some of it back
    recordPayment(data, 1, 100, "2025-01-04T09:00:00.000Z");
    const rep = reportClientLedger(data, "2025-01-01", "2025-01-05");
    const last = rep.clients[0]!.rows.at(-1)!;

    expect(last.date).toBe("04-01-2025");
    expect(last.paid).toBe(100);
    expect(last.bill).toBe(0);
    expect(last.netBill).toBe(0);
    // No invoice, so no previous-due snapshot to report
    expect(last.hasInvoice).toBe(false);
  });

  it("narrows to one client when given an id", () => {
    const rep = reportClientLedger(setupData(), "2025-01-01", "2025-01-05", 2);

    expect(rep.clients).toHaveLength(1);
    expect(rep.clients[0]!.customerId).toBe(2);
    expect(rep.clients[0]!.rows).toHaveLength(1);
  });

  it("omits clients with nothing in the range", () => {
    const rep = reportClientLedger(setupData(), "2025-01-03", "2025-01-05");

    expect(rep.clients.map((c) => c.customerId)).toEqual([1]);
    expect(rep.clients[0]!.rows).toHaveLength(1);
  });

  it("returns no clients when the range is empty", () => {
    const rep = reportClientLedger(setupData(), "2025-02-01", "2025-02-05");

    expect(rep.clients).toEqual([]);
  });
});
