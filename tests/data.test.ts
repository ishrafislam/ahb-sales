import { describe, it, expect, beforeAll } from "vitest";
import {
  initData,
  addProduct,
  updateProduct,
  listProducts,
  addCustomer,
  updateCustomer,
  listCustomers,
  type AhbDataV1,
} from "../src/main/data";
// TEST-ONLY: Set a deterministic encryption key for unit tests.
// DO NOT use this key in production builds.
process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let createEmptyDocument: (typeof import("../src/main/crypto"))["createEmptyDocument"];
let encryptJSON: (typeof import("../src/main/crypto"))["encryptJSON"];
let decryptJSON: (typeof import("../src/main/crypto"))["decryptJSON"];

beforeAll(async () => {
  const mod = await import("../src/main/crypto");
  createEmptyDocument = mod.createEmptyDocument;
  encryptJSON = mod.encryptJSON;
  decryptJSON = mod.decryptJSON;
});

describe("Phase 1 data model", () => {
  it("adds and lists products; enforces id range and duplicate prevention", () => {
    const data = initData();
    const p1 = addProduct(data, {
      id: 1,
      nameBn: "চিনি",
      unit: "kg",
      cost: 50,
      price: 60,
    });
    expect(p1.id).toBe(1);
    expect(p1.active).toBe(true);
    expect(listProducts(data).map((p) => p.id)).toEqual([1]);

    expect(() =>
      addProduct(data, {
        id: 0,
        nameBn: "খারাপ",
        unit: "kg",
        cost: 1,
        price: 1,
      })
    ).toThrow();
    expect(() =>
      addProduct(data, {
        id: 1001,
        nameBn: "খারাপ",
        unit: "kg",
        cost: 1,
        price: 1,
      })
    ).toThrow();
    expect(() =>
      addProduct(data, { id: 1, nameBn: "ডুপ", unit: "kg", cost: 1, price: 1 })
    ).toThrow();

    const p1u = updateProduct(data, 1, { price: 65, active: false });
    expect(p1u.price).toBe(65);
    expect(p1u.active).toBe(false);
  });

  it("adds and lists customers; prevents duplicates", () => {
    const data = initData();
    const c1 = addCustomer(data, { id: 10, nameBn: "Rahim", address: "Dhaka" });
    expect(c1.outstanding).toBe(0);
    expect(listCustomers(data).map((c) => c.id)).toEqual([10]);
    expect(() => addCustomer(data, { id: 10, nameBn: "Dup" })).toThrow();
    const c1u = updateCustomer(data, 10, { outstanding: 100, active: false });
    expect(c1u.outstanding).toBe(100);
    expect(c1u.active).toBe(false);
  });

  it("persists data in document roundtrip", () => {
    const doc = createEmptyDocument();
    const data = doc.data as AhbDataV1;
    addProduct(data, { id: 2, nameBn: "ডাল", unit: "kg", cost: 80, price: 95 });
    addCustomer(data, { id: 5, nameBn: "Karim" });
    const enc = encryptJSON(doc);
    const dec = decryptJSON(enc) as typeof doc;
    const data2 = dec.data as AhbDataV1;
    expect(listProducts(data2).length).toBe(1);
    expect(listCustomers(data2).length).toBe(1);
  });
});
