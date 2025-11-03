import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import ProductsView from "../src/views/ProductsView.vue";
import { currentLang } from "../src/i18n";

type DataChanged = (payload: {
  kind: string;
  action: string;
  id: number;
}) => void;

describe("ProductsView.vue", () => {
  let productsData: Array<Record<string, unknown>>;
  let dataChangedCb: DataChanged | null;

  beforeEach(() => {
    // Ensure English UI for deterministic text assertions
    currentLang.value = "en";
    productsData = [];
    dataChangedCb = null;

    const listProducts = vi.fn(async () => productsData);
    const addProduct = vi.fn(async (p: Record<string, unknown>) => {
      const prod: Record<string, unknown> = { ...p, active: true };
      productsData.push(prod);
      return prod;
    });
    const onDataChanged = (cb: DataChanged) => {
      dataChangedCb = cb;
      return () => {
        dataChangedCb = null;
      };
    };

    type AhbStub = {
      listProducts: (
        opts?: boolean | { activeOnly?: boolean }
      ) => Promise<Array<Record<string, unknown>>>;
      addProduct: (
        p: Record<string, unknown>
      ) => Promise<Record<string, unknown>>;
      onDataChanged: (cb: DataChanged) => () => void;
    };
    (window as unknown as { ahb: AhbStub }).ahb = {
      listProducts,
      addProduct,
      onDataChanged,
    };
  });

  it("shows empty state when no products", async () => {
    const wrapper = mount(ProductsView);
    await Promise.resolve();
    await nextTick();
    expect(wrapper.text()).toContain("No products");
  });

  it("renders rows when products exist", async () => {
    productsData = [
      { id: 1, nameBn: "চাল", unit: "kg", price: 50, stock: 10, active: true },
      { id: 2, nameBn: "ডাল", unit: "kg", price: 100, stock: 5, active: true },
    ];
    const wrapper = mount(ProductsView);
    await Promise.resolve();
    await nextTick();
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(wrapper.text()).toContain("চাল");
    expect(wrapper.text()).toContain("ডাল");
  });

  it("adds a product via the form and refreshes list", async () => {
    const wrapper = mount(ProductsView);
    await nextTick();
    // Fill form (order: id, nameBn, unit, price, stock)
    const inputs = wrapper.findAll("form input");
    expect(inputs.length).toBe(5);
    await inputs[0].setValue("3");
    await inputs[1].setValue("তেল");
    await inputs[2].setValue("ltr");
    await inputs[3].setValue("180");
    await inputs[4].setValue("20");
    await wrapper.find("form").trigger("submit.prevent");
    await Promise.resolve();
    await nextTick();

    // list should have 1 row now
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(wrapper.text()).toContain("তেল");
  });

  it("refreshes on data:changed events for products", async () => {
    productsData = [
      { id: 1, nameBn: "চিনি", unit: "kg", price: 120, stock: 2, active: true },
    ];
    const wrapper = mount(ProductsView);
    await nextTick();
    // trigger an external change
    productsData = [
      ...productsData,
      { id: 2, nameBn: "নুন", unit: "kg", price: 30, stock: 50, active: true },
    ];
    dataChangedCb?.({ kind: "product", action: "add", id: 2 });
    await Promise.resolve();
    await nextTick();
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(wrapper.text()).toContain("নুন");
  });
});
