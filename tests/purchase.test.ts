import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  postPurchase,
  listProductPurchases,
  type AhbDataV1,
} from "../src/main/data";

// Ensure tests run with deterministic environment when needed
process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("postPurchase (Phase 3)", () => {
  it("adds a purchase and increments product stock", () => {
    const data: AhbDataV1 = initData();
    addProduct(data, {
      id: 10,
      nameBn: "চাল",
      unit: "kg",
      price: 50,
      stock: 5,
    });

    const p = postPurchase(data, { productId: 10, quantity: 7 });

    expect(p.productId).toBe(10);
    expect(p.quantity).toBe(7);
    expect(p.unit).toBe("kg");
    expect(/\d{4}-\d{2}-\d{2}T/.test(p.date)).toBe(true);

    // stock incremented
    const prod = data.products.find((x) => x.id === 10)!;
    expect(prod.stock).toBe(12);

    // listed in purchase history
    const rows = listProductPurchases(data, 10);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ productId: 10, unit: "kg", quantity: 7 });
  });

  it("validates product, quantity, and date", () => {
    const data = initData();
    addProduct(data, {
      id: 1,
      nameBn: "Oil",
      unit: "ltr",
      price: 100,
      stock: 0,
    });

    // invalid product
    expect(() => postPurchase(data, { productId: 2, quantity: 1 })).toThrow(
      /Product not found/
    );
    // invalid quantity
    expect(() => postPurchase(data, { productId: 1, quantity: 0 })).toThrow(
      /Quantity must be > 0/
    );
    expect(() => postPurchase(data, { productId: 1, quantity: -5 })).toThrow(
      /Quantity must be > 0/
    );
    // invalid date (runtime validation)
    expect(() =>
      postPurchase(data, { productId: 1, quantity: 1, date: "nope" })
    ).toThrow(/Invalid date/);
  });
});
