import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import RecordDetails from "../../src/views/RecordDetails.vue";
import { currentLang } from "../../src/i18n";

describe("Record details window", () => {
  const getCustomerById = vi.fn();
  const getProductById = vi.fn();

  const customer = {
    id: 12,
    nameBn: "রহিম",
    address: "ঢাকা",
    phone: "01711000111",
    outstanding: 250.5,
    active: true,
  };

  const product = {
    id: 5,
    nameBn: "চাল",
    description: "মোটা",
    unit: "kg",
    price: 55.5,
    stock: 40,
    active: true,
  };

  beforeEach(() => {
    currentLang.value = "en";
    getCustomerById.mockReset().mockResolvedValue(customer);
    getProductById.mockReset().mockResolvedValue(product);
    (window as unknown as { ahb: unknown }).ahb = {
      getCustomerById,
      getProductById,
    };
  });

  async function mountAt(hash: string) {
    window.location.hash = hash;
    const wrapper = mount(RecordDetails, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  const fieldTexts = (wrapper: Awaited<ReturnType<typeof mountAt>>) =>
    wrapper.findAll('[data-role="record-field"]').map((f) => f.text());

  it("shows every customer field", async () => {
    const wrapper = await mountAt("#record-details/customer/12");

    expect(getCustomerById).toHaveBeenCalledWith(12);
    expect(fieldTexts(wrapper)).toEqual([
      "Customer ID: 12",
      "Customer Name: রহিম",
      "Address: ঢাকা",
      "Phone Number: 01711000111",
      "Outstanding: 250.50",
      "Status: Active",
    ]);
    wrapper.unmount();
  });

  it("shows every product field", async () => {
    const wrapper = await mountAt("#record-details/product/5");

    expect(getProductById).toHaveBeenCalledWith(5);
    expect(fieldTexts(wrapper)).toEqual([
      "Item ID: 5",
      "Item Name: চাল",
      "Item Details: মোটা",
      "Unit: kg",
      "Unit Price: 55.50",
      "Stock: 40",
      "Status: Active",
    ]);
    wrapper.unmount();
  });

  it("reads the status off the record", async () => {
    getProductById.mockResolvedValue({ ...product, active: false });
    const wrapper = await mountAt("#record-details/product/5");

    expect(fieldTexts(wrapper).at(-1)).toBe("Status: Inactive");
    wrapper.unmount();
  });

  it("dashes the fields the record does not carry", async () => {
    getCustomerById.mockResolvedValue({
      ...customer,
      address: undefined,
      phone: "",
    });
    const wrapper = await mountAt("#record-details/customer/12");

    expect(fieldTexts(wrapper)[2]).toBe("Address: —");
    expect(fieldTexts(wrapper)[3]).toBe("Phone Number: —");
    wrapper.unmount();
  });

  it("says so when the id holds no record", async () => {
    getCustomerById.mockResolvedValue(null);
    const wrapper = await mountAt("#record-details/customer/999");

    expect(fieldTexts(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain("Customer not found");
    wrapper.unmount();
  });

  it("closes the window from the bottom button", async () => {
    const close = vi.fn();
    Object.defineProperty(window, "close", { value: close, writable: true });
    const wrapper = await mountAt("#record-details/customer/12");

    const button = wrapper
      .findAll("button")
      .find((b) => b.text() === "Close")!;
    await button.trigger("click");

    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
