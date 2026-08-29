import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  postPurchase,
  updatePurchase,
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
    expect(rows[0]).toMatchObject({
      id: p.id,
      productId: 10,
      unit: "kg",
      quantity: 7,
    });
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

describe("updatePurchase", () => {
  function seed() {
    const data: AhbDataV1 = initData();
    addProduct(data, { id: 10, nameBn: "চাল", unit: "kg", price: 50, stock: 5 });
    const purchase = postPurchase(data, { productId: 10, quantity: 20 });
    return { data, purchase };
  }

  it("moves stock by the difference, in either direction", () => {
    const { data, purchase } = seed();
    // 5 to start with, plus the 20 that came in
    expect(data.products.find((p) => p.id === 10)!.stock).toBe(25);

    updatePurchase(data, purchase.id, { quantity: 23 });
    expect(data.products.find((p) => p.id === 10)!.stock).toBe(28);

    updatePurchase(data, purchase.id, { quantity: 8 });
    expect(data.products.find((p) => p.id === 10)!.stock).toBe(13);
  });

  it("leaves the day it was bought on alone", () => {
    const { data, purchase } = seed();
    const updated = updatePurchase(data, purchase.id, { quantity: 4 });

    expect(updated.id).toBe(purchase.id);
    expect(updated.date).toBe(purchase.date);
    expect(updated.createdAt).toBe(purchase.createdAt);
    expect(updated.quantity).toBe(4);
    // Corrected in place, not added alongside the original
    const rows = listProductPurchases(data, 10);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      id: purchase.id,
      quantity: 4,
    });
  });

  it("validates the purchase and the quantity", () => {
    const { data, purchase } = seed();

    expect(() => updatePurchase(data, "nope", { quantity: 1 })).toThrow(
      /Purchase not found/
    );
    expect(() => updatePurchase(data, purchase.id, { quantity: 0 })).toThrow(
      /Quantity must be > 0/
    );
    expect(() => updatePurchase(data, purchase.id, { quantity: -3 })).toThrow(
      /Quantity must be > 0/
    );
    // A rejected edit moves nothing
    expect(data.products.find((p) => p.id === 10)!.stock).toBe(25);
  });
});
