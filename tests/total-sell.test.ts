import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  postInvoice,
  reportTotalSell,
  type AhbDataV1,
} from "../src/main/data";

process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function seed(): AhbDataV1 {
  const data = initData();
  addProduct(data, { id: 1, nameBn: "চাল", unit: "kg", price: 50, stock: 500 });
  addProduct(data, { id: 2, nameBn: "ডাল", unit: "kg", price: 80, stock: 500 });
  addProduct(data, { id: 5, nameBn: "তেল", unit: "L", price: 200, stock: 500 });
  addCustomer(data, { id: 7, nameBn: "রহিম" });

  // Two invoices on the same day, one of them anonymous
  postInvoice(data, {
    date: "2026-07-10T09:00:00.000Z",
    customerId: 7,
    lines: [
      { productId: 1, quantity: 10, rate: 50 },
      { productId: 2, quantity: 4, rate: 80 },
    ],
  });
  postInvoice(data, {
    date: "2026-07-10T15:00:00.000Z",
    lines: [{ productId: 1, quantity: 5, rate: 50 }],
  });
  // A later day inside the range
  postInvoice(data, {
    date: "2026-07-12T09:00:00.000Z",
    customerId: 7,
    lines: [{ productId: 5, quantity: 2.5, rate: 200 }],
  });
  // Outside the range on both sides
  postInvoice(data, {
    date: "2026-07-01T09:00:00.000Z",
    lines: [{ productId: 1, quantity: 99, rate: 50 }],
  });
  postInvoice(data, {
    date: "2026-08-01T09:00:00.000Z",
    lines: [{ productId: 2, quantity: 77, rate: 80 }],
  });
  return data;
}

describe("reportTotalSell", () => {
  it("groups quantity by day and item, oldest day first", () => {
    const rep = reportTotalSell(seed(), "2026-07-05", "2026-07-31");

    expect(rep.days.map((d) => d.date)).toEqual(["10-07-2026", "12-07-2026"]);

    // Both invoices for item 1 on the 10th are summed; rows go by product id
    expect(rep.days[0]!.rows).toEqual([
      { productId: 1, productNameBn: "চাল", unit: "kg", quantity: 15 },
      { productId: 2, productNameBn: "ডাল", unit: "kg", quantity: 4 },
    ]);
    expect(rep.days[1]!.rows).toEqual([
      { productId: 5, productNameBn: "তেল", unit: "L", quantity: 2.5 },
    ]);
  });

  it("reports a day as its rows alone, with no day total", () => {
    const rep = reportTotalSell(seed(), "2026-07-05", "2026-07-31");

    expect(Object.keys(rep.days[0]!).sort()).toEqual(["date", "rows"]);
  });

  it("counts anonymous sales like any other", () => {
    // The 10th's item 1 total (15) already includes the anonymous invoice
    const rep = reportTotalSell(seed(), "2026-07-10", "2026-07-10");

    expect(rep.days).toHaveLength(1);
    expect(rep.days[0]!.rows[0]).toMatchObject({ productId: 1, quantity: 15 });
  });

  it("excludes days outside the range, boundaries included", () => {
    const data = seed();

    expect(reportTotalSell(data, "2026-07-10", "2026-07-10").days).toHaveLength(
      1
    );
    expect(
      reportTotalSell(data, "2026-07-01", "2026-08-01").days.map((d) => d.date)
    ).toEqual(["01-07-2026", "10-07-2026", "12-07-2026", "01-08-2026"]);
  });

  it("returns no days for a range with no sales", () => {
    expect(reportTotalSell(seed(), "2026-06-01", "2026-06-30")).toEqual({
      days: [],
    });
  });

  it("leaves the name blank for a product that no longer exists", () => {
    const data = seed();
    data.products = data.products.filter((p) => p.id !== 5);

    const rep = reportTotalSell(data, "2026-07-12", "2026-07-12");
    expect(rep.days[0]!.rows[0]!.productNameBn).toBeUndefined();
    expect(rep.days[0]!.rows[0]!.unit).toBeUndefined();
  });
});
