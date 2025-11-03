import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import DashboardView from "../src/views/Dashboard.vue";
import type { PostInvoiceInput } from "../src/main/data";
import { currentLang } from "../src/i18n";

type DataChangedPayload = {
  kind: "product" | "customer";
  action: string;
  id: number;
};

describe("DashboardView.vue", () => {
  let productsData: Array<Record<string, unknown>>;
  let customersData: Array<Record<string, unknown>>;
  let postInvoice: ReturnType<
    typeof vi.fn<(payload: PostInvoiceInput) => Promise<unknown>>
  >;

  beforeEach(() => {
    // Ensure English UI for deterministic text assertions
    currentLang.value = "en";
    productsData = [];
    customersData = [];
    postInvoice = vi.fn(async (payload: PostInvoiceInput) => {
      return {
        id: "inv-1",
        no: 1,
        date: new Date().toISOString(),
        customerId: payload.customerId,
        lines: payload.lines.map((l, i: number) => ({
          sn: i + 1,
          productId: l.productId,
          unit: "unit",
          quantity: l.quantity,
          rate: l.rate,
          lineTotal: l.quantity * l.rate,
        })),
        discount: payload.discount || 0,
        totals: { subtotal: 0, net: 0 },
        status: "posted",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const listProducts = vi.fn(async () => productsData);
    const listCustomers = vi.fn(async () => customersData);
    const onDataChanged: (cb: (p: DataChangedPayload) => void) => () => void = (
      cb: (p: DataChangedPayload) => void
    ) => {
      void cb; // intentionally unused in tests
      return () => undefined;
    };

    type AhbStub = {
      listProducts: (
        opts?: boolean | { activeOnly?: boolean }
      ) => Promise<Array<Record<string, unknown>>>;
      listCustomers: (
        opts?: boolean | { activeOnly?: boolean }
      ) => Promise<Array<Record<string, unknown>>>;
      onDataChanged: (cb: (p: DataChangedPayload) => void) => () => void;
      postInvoice: (payload: PostInvoiceInput) => Promise<unknown>;
    };

    (window as unknown as { ahb: AhbStub }).ahb = {
      listProducts,
      listCustomers,
      onDataChanged,
      postInvoice,
    } as unknown as AhbStub;
  });

  it("renders prompt to select customer and shows zero totals", async () => {
    const wrapper = mount(DashboardView);
    await Promise.resolve();
    await nextTick();
    expect(wrapper.text()).toContain("Select a customer");
    expect(wrapper.text()).toContain(
      "Start by searching and selecting a customer on the left."
    );
    expect(wrapper.text()).toContain("Total Price");
    // Expect 0.00 visible at least once (subtotal/net)
    expect(wrapper.text()).toContain("0.00");
  });

  it("selects a customer from dropdown and shows info", async () => {
    customersData = [
      { id: 101, nameBn: "Rahim" },
      { id: 202, nameBn: "Karim" },
    ];
    const wrapper = mount(DashboardView, { attachTo: document.body });
    await Promise.resolve();
    await nextTick();

    const input = wrapper.get("#search-customer");
    await input.trigger("focus");
    await input.setValue("Rah");
    await nextTick();

    // pick first matching dropdown item (Rahim)
    const items = wrapper
      .findAll("li")
      .filter((li) => li.text().includes("Rahim"));
    expect(items.length).toBeGreaterThan(0);
    await items[0].trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Customer Information");
    expect(wrapper.text()).toContain("Rahim");
    expect(wrapper.text()).toContain("101");
  });

  it.skip("adds a product, edits quantity, and updates totals", async () => {
    productsData = [
      {
        id: 1,
        nameBn: "চিনি",
        unit: "kg",
        price: 100,
        stock: 50,
        active: true,
      },
    ];
    const wrapper = mount(DashboardView, { attachTo: document.body });
    await Promise.resolve();
    await nextTick();

    const pInput = wrapper.get("#search-product");
    await pInput.trigger("focus");
    await pInput.setValue("চিনি");
    await nextTick();

    // Robust wait helper with small delay between ticks
    const waitFor = async (fn: () => boolean, tries = 50, delayMs = 10) => {
      for (let i = 0; i < tries; i++) {
        await Promise.resolve();
        await nextTick();
        if (fn()) return;
        await new Promise((r) => setTimeout(r, delayMs));
      }
      throw new Error("Timeout waiting for condition");
    };

    // Prefer clicking a dropdown item if it appears; otherwise click Add button
    const dropdownItem = wrapper
      .findAll("li")
      .find((li) => li.text().includes("চিনি"));
    if (dropdownItem) {
      await dropdownItem.trigger("click");
    } else {
      const addBtn = wrapper.findAll("button").find((b) => b.text() === "Add");
      expect(addBtn).toBeTruthy();
      await addBtn!.trigger("click");
    }
    await nextTick();

    // Wait until at least one non-empty row appears
    await waitFor(() =>
      wrapper.findAll("tbody tr").some((tr) => !tr.text().includes("No items"))
    );

    // One row present
    const rows = wrapper
      .findAll("tbody tr")
      .filter((tr) => !tr.text().includes("No items"));
    expect(rows.length).toBe(1);
    expect(wrapper.text()).toContain("চিনি");
    expect(wrapper.text()).toContain("kg");

    // Edit quantity to 3
    const qtyInput = rows[0].find("input[type='number']");
    await qtyInput.setValue("3");
    await qtyInput.trigger("input");
    await nextTick();

    // Expect totals to be 300.00
    expect(wrapper.text()).toContain("300.00");
  });

  it("disables Complete when discount > subtotal; then posts and resets on Complete", async () => {
    customersData = [{ id: 1, nameBn: "Buyer" }];
    productsData = [
      {
        id: 10,
        nameBn: "Soap",
        unit: "pc",
        price: 50,
        stock: 10,
        active: true,
      },
    ];
    const wrapper = mount(DashboardView, { attachTo: document.body });
    await Promise.resolve();
    await nextTick();

    // Select customer
    const cInput = wrapper.get("#search-customer");
    await cInput.trigger("focus");
    await cInput.setValue("Buyer");
    await nextTick();
    const cItems = wrapper
      .findAll("li")
      .filter((li) => li.text().includes("Buyer"));
    await cItems[0].trigger("click");
    await nextTick();

    // Add product by selecting from dropdown
    const pInput = wrapper.get("#search-product");
    await pInput.trigger("focus");
    await pInput.setValue("Soap");
    await nextTick();
    const pItems = wrapper
      .findAll("li")
      .filter((li) => li.text().includes("Soap"));
    expect(pItems.length).toBeGreaterThan(0);
    await pItems[0].trigger("click");
    await nextTick();

    // Set discount higher than subtotal (50)
    // Find the discount input by locating the container with label 'Discount'
    const discountRow = wrapper
      .findAll("div")
      .find(
        (d) =>
          d.text().includes("Discount") &&
          d.find("input[type='number']").exists()
      );
    expect(discountRow).toBeTruthy();
    const discountInput = discountRow!.find("input[type='number']");
    await discountInput.setValue("60");
    await discountInput.trigger("input");
    await nextTick();

    const completeBtn = wrapper
      .findAll("button")
      .find((b) => b.text() === "Complete")!;
    expect(completeBtn.attributes("disabled")).toBeDefined();

    // Set valid discount and complete
    await discountInput.setValue("10");
    await discountInput.trigger("input");
    await nextTick();

    expect(completeBtn.attributes("disabled")).toBeUndefined();
    await completeBtn.trigger("click");
    await Promise.resolve();
    await nextTick();

    expect(postInvoice).toHaveBeenCalledTimes(1);
    const args = postInvoice.mock.calls[0][0];
    expect(args.customerId).toBe(1);
    expect(args.discount).toBe(10);
    expect(Array.isArray(args.lines) && args.lines.length).toBe(1);

    // After complete, draft resets -> No items
    expect(wrapper.text()).toContain("No items");
  });
});
