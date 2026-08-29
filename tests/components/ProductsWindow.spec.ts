import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Products from "../../src/views/Products.vue";
import { currentLang } from "../../src/i18n";

type ProductStub = {
  id: number;
  nameBn: string;
  description?: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

describe("Products window", () => {
  const listProducts = vi.fn();
  const listProductPurchases = vi.fn();
  const addProduct = vi.fn();
  const updateProduct = vi.fn();
  const openPurchaseEntryWindow = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    listProducts.mockReset().mockResolvedValue([
      {
        id: 1,
        nameBn: "Item 1",
        description: "Fine grain",
        unit: "Bag",
        price: 466,
        stock: 50,
        active: true,
      },
      {
        id: 3,
        nameBn: "Item 3",
        unit: "kg",
        price: 12.5,
        stock: 0,
        active: true,
      },
    ] as ProductStub[]);
    listProductPurchases.mockReset().mockResolvedValue([]);
    addProduct.mockReset().mockResolvedValue({});
    updateProduct.mockReset().mockResolvedValue({});
    openPurchaseEntryWindow.mockReset().mockResolvedValue(undefined);
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      listProducts,
      listProductPurchases,
      addProduct,
      updateProduct,
      openPurchaseEntryWindow,
      onDataChanged: vi.fn(() => () => undefined),
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  async function mountView() {
    const wrapper = mount(Products, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const field = (wrapper: View, id: string) =>
    wrapper.find(`#${id}`).element as HTMLInputElement;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label);

  const selectRow = async (wrapper: View, id: number) => {
    await wrapper.find(`li[data-id="${id}"]`).trigger("click");
    await new Promise((r) => setTimeout(r, 0));
  };

  it("lists every slot and shows the selected item read-only", async () => {
    const wrapper = await mountView();
    const rows = wrapper.findAll("li[data-id]");
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0]!.text()).toContain("Item 1");
    expect(rows[1]!.text().trim()).toBe("2");

    expect(field(wrapper, "item-id").value).toBe("1");
    expect(field(wrapper, "item-name").value).toBe("Item 1");
    expect(field(wrapper, "item-details").value).toBe("Fine grain");
    expect(field(wrapper, "item-price").value).toBe("466");
    expect(field(wrapper, "item-unit").value).toBe("Bag");
    expect(field(wrapper, "item-stock").value).toBe("50");

    // Locked until Edit — read-only rather than disabled, so the name can
    // still be selected and copied out of the form
    for (const id of ["item-name", "item-details", "item-price", "item-unit"]) {
      expect(field(wrapper, id).readOnly, id).toBe(true);
      expect(field(wrapper, id).disabled, id).toBe(false);
    }
    // The figures the form only ever displays are the same
    expect(field(wrapper, "item-id").disabled).toBe(false);
    expect(field(wrapper, "item-stock").disabled).toBe(false);
    wrapper.unmount();
  });

  it("offers only Purchase Entry / Edit / Close on an existing item", async () => {
    const wrapper = await mountView();
    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels).toEqual(["Purchase Entry", "Edit", "Close"]);
    wrapper.unmount();
  });

  it("keeps stock read-only in every state", async () => {
    const wrapper = await mountView();
    expect(field(wrapper, "item-stock").readOnly).toBe(true);

    await button(wrapper, "Edit")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(field(wrapper, "item-stock").readOnly).toBe(true);

    // Empty slot: an add form, but stock still starts at 0 and is not editable
    await selectRow(wrapper, 2);
    expect(field(wrapper, "item-stock").readOnly).toBe(true);
    expect(field(wrapper, "item-stock").value).toBe("0");
    wrapper.unmount();
  });

  it("Edit reveals Save and updates the existing item", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(field(wrapper, "item-name").readOnly).toBe(false);
    expect(button(wrapper, "Edit")).toBeUndefined();
    const save = button(wrapper, "Save")!;
    expect(save).toBeTruthy();

    await wrapper.find("#item-name").setValue("Renamed");
    await wrapper.find("#item-details").setValue("Coarse grain");
    await wrapper.find("#item-price").setValue("500");
    await wrapper.find("#item-unit").setValue("Sack");
    await save.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(updateProduct).toHaveBeenCalledWith(1, {
      nameBn: "Renamed",
      description: "Coarse grain",
      unit: "Sack",
      price: 500,
      active: true,
    });
    expect(addProduct).not.toHaveBeenCalled();
    // Re-locks after saving
    expect(field(wrapper, "item-name").readOnly).toBe(true);
    expect(button(wrapper, "Edit")).toBeTruthy();
    wrapper.unmount();
  });

  it("an empty slot is editable straight away and offers Add", async () => {
    const wrapper = await mountView();
    await selectRow(wrapper, 2);

    // No Edit click needed
    expect(field(wrapper, "item-name").value).toBe("");
    expect(field(wrapper, "item-name").readOnly).toBe(false);
    expect(field(wrapper, "item-details").readOnly).toBe(false);
    expect(button(wrapper, "Edit")).toBeUndefined();
    expect(button(wrapper, "Save")).toBeUndefined();
    const add = button(wrapper, "Add")!;
    expect(add).toBeTruthy();
    // Add stays disabled until a name is entered
    expect((add.element as HTMLButtonElement).disabled).toBe(true);

    await wrapper.find("#item-name").setValue("New Item");
    await wrapper.find("#item-unit").setValue("Bag");
    await wrapper.find("#item-price").setValue("75.5");
    await button(wrapper, "Add")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(addProduct).toHaveBeenCalledWith({
      id: 2,
      nameBn: "New Item",
      description: "",
      unit: "Bag",
      price: 75.5,
      active: true,
    });
    expect(updateProduct).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("flips Add to Edit and locks the fields once the item exists", async () => {
    const wrapper = await mountView();
    await selectRow(wrapper, 2);
    await wrapper.find("#item-name").setValue("New Item");

    // The reload after adding now sees the item at that slot
    listProducts.mockResolvedValue([
      {
        id: 2,
        nameBn: "New Item",
        unit: "unit",
        price: 0,
        stock: 0,
        active: true,
      },
    ] as ProductStub[]);
    await button(wrapper, "Add")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(button(wrapper, "Add")).toBeUndefined();
    expect(button(wrapper, "Edit")).toBeTruthy();
    expect(field(wrapper, "item-name").readOnly).toBe(true);
    expect(field(wrapper, "item-name").value).toBe("New Item");
    wrapper.unmount();
  });

  it("shows the latest purchase date and quantity", async () => {
    listProductPurchases.mockImplementation(async (id: number) =>
      id === 1
        ? [
            { date: "2026-05-07T10:00:00.000Z", unit: "Bag", quantity: 150 },
            { date: "2026-04-01T10:00:00.000Z", unit: "Bag", quantity: 20 },
          ]
        : []
    );
    const wrapper = await mountView();

    expect(field(wrapper, "item-last-purchase-date").value).toBe("07/05/2026");
    expect(field(wrapper, "item-last-purchase-amount").value).toBe("150");
    expect(field(wrapper, "item-last-purchase-date").readOnly).toBe(true);
    expect(field(wrapper, "item-last-purchase-amount").readOnly).toBe(true);

    // An item with no purchases leaves both blank
    await selectRow(wrapper, 3);
    expect(field(wrapper, "item-last-purchase-date").value).toBe("");
    expect(field(wrapper, "item-last-purchase-amount").value).toBe("");
    wrapper.unmount();
  });

  it("traverses the list with the up and down arrow keys", async () => {
    const wrapper = await mountView();
    const list = wrapper.find("div[tabindex='0']");

    // Focused on open, so arrows work without clicking the list first
    expect(document.activeElement).toBe(list.element);

    // Up at the first slot stays put
    await list.trigger("keydown.up");
    expect(field(wrapper, "item-id").value).toBe("1");

    await list.trigger("keydown.down");
    expect(field(wrapper, "item-id").value).toBe("2");
    expect(field(wrapper, "item-name").value).toBe("");

    await list.trigger("keydown.down");
    expect(field(wrapper, "item-id").value).toBe("3");
    expect(field(wrapper, "item-name").value).toBe("Item 3");
    expect(wrapper.find("li[data-id='3']").classes()).toContain("bg-blue-100");

    await list.trigger("keydown.up");
    expect(field(wrapper, "item-id").value).toBe("2");
    wrapper.unmount();
  });

  it("switching rows discards an in-progress edit", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await wrapper.find("#item-name").setValue("Discarded");
    await selectRow(wrapper, 3);

    expect(button(wrapper, "Save")).toBeUndefined();
    expect(field(wrapper, "item-name").value).toBe("Item 3");
    expect(field(wrapper, "item-name").readOnly).toBe(true);
    wrapper.unmount();
  });

  it("shows a save error and stays editable", async () => {
    updateProduct.mockRejectedValueOnce(new Error("Product not found"));
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await wrapper.find("#item-name").setValue("Renamed");
    await button(wrapper, "Save")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.text()).toContain("Product not found");
    expect(field(wrapper, "item-name").readOnly).toBe(false);
    wrapper.unmount();
  });

  it("Purchase Entry opens the window on the selected item", async () => {
    const wrapper = await mountView();
    await selectRow(wrapper, 3);
    await button(wrapper, "Purchase Entry")!.trigger("click");

    expect(openPurchaseEntryWindow).toHaveBeenCalledWith(3);
    wrapper.unmount();
  });

  it("disables Purchase Entry on an empty slot", async () => {
    const wrapper = await mountView();
    await selectRow(wrapper, 2);

    const entry = button(wrapper, "Purchase Entry")!;
    expect((entry.element as HTMLButtonElement).disabled).toBe(true);
    await entry.trigger("click");
    expect(openPurchaseEntryWindow).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("Close closes the window", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Close")!.trigger("click");
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
