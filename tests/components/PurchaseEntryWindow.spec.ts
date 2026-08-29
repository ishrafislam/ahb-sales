import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PurchaseEntry from "../../src/views/PurchaseEntry.vue";
import { currentLang } from "../../src/i18n";
import { MAX_PURCHASE_QUANTITY } from "../../src/constants/business";

type ProductStub = {
  id: number;
  nameBn: string;
  description?: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

type PurchaseStub = {
  id: string;
  date: string;
  unit: string;
  quantity: number;
};

describe("Purchase entry window", () => {
  const listProducts = vi.fn();
  const listProductPurchases = vi.fn();
  const postPurchase = vi.fn();
  const updatePurchase = vi.fn();
  const close = vi.fn();

  const item1: ProductStub = {
    id: 1,
    nameBn: "Item 1",
    description: "Fine grain",
    unit: "Bag",
    price: 466,
    stock: 50,
    active: true,
  };

  const purchases1: PurchaseStub[] = [
    { id: "pur-1", date: "2026-07-30T10:00:00.000Z", unit: "Bag", quantity: 120 },
    { id: "pur-2", date: "2026-07-15T10:00:00.000Z", unit: "Bag", quantity: 55 },
  ];

  beforeEach(() => {
    currentLang.value = "en";
    window.location.hash = "";
    listProducts.mockReset().mockResolvedValue([
      item1,
      {
        id: 3,
        nameBn: "Item 3",
        unit: "kg",
        price: 12.5,
        stock: 0,
        active: true,
      },
    ] as ProductStub[]);
    listProductPurchases
      .mockReset()
      .mockImplementation(async (id: number) => (id === 1 ? purchases1 : []));
    postPurchase.mockReset().mockResolvedValue({});
    updatePurchase.mockReset().mockResolvedValue({});
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      listProducts,
      listProductPurchases,
      postPurchase,
      updatePurchase,
      onDataChanged: vi.fn(() => () => undefined),
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  async function mountView() {
    const wrapper = mount(PurchaseEntry, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const field = (wrapper: View, id: string) =>
    wrapper.find(`#${id}`).element as HTMLInputElement;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;

  // The last cell is the edit button's column
  const rows = (wrapper: View) =>
    wrapper.findAll('tr[data-row="grid"]').map((r) =>
      r
        .findAll("td")
        .slice(0, -1)
        .map((c) => c.text())
    );

  const editButtons = (wrapper: View) =>
    wrapper.findAll('[data-role="row-action"]');

  const selectRow = async (wrapper: View, id: number) => {
    await wrapper.find(`li[data-id="${id}"]`).trigger("click");
    await new Promise((r) => setTimeout(r, 0));
  };

  const setAmount = async (wrapper: View, value: string) => {
    await wrapper.find("#purchase-amount").setValue(value);
  };

  it("shows the selected item's details read-only", async () => {
    const wrapper = await mountView();

    expect(field(wrapper, "item-id").value).toBe("1");
    expect(field(wrapper, "item-name").value).toBe("Item 1");
    expect(field(wrapper, "item-details").value).toBe("Fine grain");
    expect(field(wrapper, "item-stock").value).toBe("50");
    expect(field(wrapper, "item-unit").value).toBe("Bag");
    expect(field(wrapper, "item-last-purchase-date").value).toBe("30/07/2026");
    expect(field(wrapper, "item-last-purchase-amount").value).toBe("120");

    for (const id of [
      "item-id",
      "item-name",
      "item-details",
      "item-stock",
      "item-unit",
      "item-last-purchase-date",
      "item-last-purchase-amount",
      "purchase-date",
    ]) {
      expect(field(wrapper, id).readOnly, id).toBe(true);
    }
    wrapper.unmount();
  });

  it("lists the purchase history newest-first and shows an empty state", async () => {
    const wrapper = await mountView();

    expect(rows(wrapper)).toEqual([
      ["30/07/2026", "120", "Bag"],
      ["15/07/2026", "55", "Bag"],
    ]);

    await selectRow(wrapper, 3);
    expect(rows(wrapper)).toEqual([]);
    expect(wrapper.find("tbody").text()).toContain("No purchases");
    wrapper.unmount();
  });

  it("opens on the item id carried in the hash", async () => {
    window.location.hash = "#purchase-entry/3";
    const wrapper = await mountView();

    expect(field(wrapper, "item-id").value).toBe("3");
    expect(field(wrapper, "item-name").value).toBe("Item 3");
    wrapper.unmount();
  });

  it("only enables Update for a valid amount", async () => {
    const wrapper = await mountView();
    const disabled = () =>
      (button(wrapper, "Update").element as HTMLButtonElement).disabled;

    // Blank
    expect(disabled()).toBe(true);

    await setAmount(wrapper, "0");
    expect(disabled()).toBe(true);

    await setAmount(wrapper, "-5");
    expect(disabled()).toBe(true);

    await setAmount(wrapper, String(MAX_PURCHASE_QUANTITY + 1));
    expect(disabled()).toBe(true);

    await setAmount(wrapper, "25.5");
    expect(disabled()).toBe(false);

    // An empty slot has nothing to add stock to
    await selectRow(wrapper, 2);
    expect(field(wrapper, "purchase-amount").readOnly).toBe(true);
    expect(disabled()).toBe(true);
    wrapper.unmount();
  });

  it("posts the purchase and refreshes stock, last purchase and the table", async () => {
    const wrapper = await mountView();
    await setAmount(wrapper, "25");

    listProducts.mockResolvedValue([{ ...item1, stock: 75 }] as ProductStub[]);
    listProductPurchases.mockResolvedValue([
      { id: "pur-3", date: "2026-07-31T10:00:00.000Z", unit: "Bag", quantity: 25 },
      ...purchases1,
    ] as PurchaseStub[]);

    await button(wrapper, "Update").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(postPurchase).toHaveBeenCalledWith({ productId: 1, quantity: 25 });
    expect(field(wrapper, "item-stock").value).toBe("75");
    expect(field(wrapper, "item-last-purchase-date").value).toBe("31/07/2026");
    expect(field(wrapper, "item-last-purchase-amount").value).toBe("25");
    expect(rows(wrapper)[0]).toEqual(["31/07/2026", "25", "Bag"]);

    // Cleared and ready for the next entry
    expect(field(wrapper, "purchase-amount").value).toBe("");
    expect(
      (button(wrapper, "Update").element as HTMLButtonElement).disabled
    ).toBe(true);
    wrapper.unmount();
  });

  it("loads a history row into the entry fields for correction", async () => {
    const wrapper = await mountView();

    // The edit column sits after Unit, one button per row
    expect(
      wrapper.findAll("thead th").map((h) => h.text())
    ).toEqual(["Date", "Amount", "Unit", "Edit"]);
    expect(editButtons(wrapper).length).toBe(2);

    await editButtons(wrapper)[1]!.trigger("click");
    await wrapper.vm.$nextTick();

    // The older row: its own date in place of today's, its quantity ready
    expect(field(wrapper, "purchase-date").value).toBe("15/07/2026");
    expect(field(wrapper, "purchase-amount").value).toBe("55");
    expect(document.activeElement).toBe(field(wrapper, "purchase-amount"));
    wrapper.unmount();
  });

  it("will not half-load a row that carries no id", async () => {
    listProductPurchases.mockResolvedValue([
      { date: "2026-07-30T10:00:00.000Z", unit: "Bag", quantity: 120 },
    ] as unknown as PurchaseStub[]);
    const wrapper = await mountView();

    await editButtons(wrapper)[0]!.trigger("click");
    await wrapper.vm.$nextTick();

    // Nothing loaded, so Enter cannot quietly post a new purchase instead
    expect(field(wrapper, "purchase-amount").value).toBe("");
    expect(field(wrapper, "purchase-date").value).toBe(
      new Date().toLocaleDateString("en-GB")
    );
    wrapper.unmount();
  });

  it("updates the loaded purchase instead of posting a new one", async () => {
    const wrapper = await mountView();
    await editButtons(wrapper)[0]!.trigger("click");
    await setAmount(wrapper, "90");

    listProducts.mockResolvedValue([{ ...item1, stock: 20 }] as ProductStub[]);
    listProductPurchases.mockResolvedValue([
      { ...purchases1[0]!, quantity: 90 },
      purchases1[1]!,
    ] as PurchaseStub[]);

    await wrapper.find("#purchase-amount").trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(updatePurchase).toHaveBeenCalledWith("pur-1", { quantity: 90 });
    expect(postPurchase).not.toHaveBeenCalled();
    expect(rows(wrapper)[0]).toEqual(["30/07/2026", "90", "Bag"]);
    // Back to a plain entry: today's date, empty box, no Cancel
    expect(field(wrapper, "purchase-date").value).toBe(
      new Date().toLocaleDateString("en-GB")
    );
    expect(field(wrapper, "purchase-amount").value).toBe("");
    expect(wrapper.findAll("button").some((b) => b.text() === "Cancel")).toBe(
      false
    );
    wrapper.unmount();
  });

  it("Cancel drops the loaded row and leaves the purchase alone", async () => {
    const wrapper = await mountView();
    await editButtons(wrapper)[0]!.trigger("click");
    await setAmount(wrapper, "90");

    await button(wrapper, "Cancel").trigger("click");
    await wrapper.vm.$nextTick();

    expect(updatePurchase).not.toHaveBeenCalled();
    expect(field(wrapper, "purchase-date").value).toBe(
      new Date().toLocaleDateString("en-GB")
    );
    expect(field(wrapper, "purchase-amount").value).toBe("");
    expect(
      (button(wrapper, "Update").element as HTMLButtonElement).disabled
    ).toBe(true);
    wrapper.unmount();
  });

  it("moving to another item drops an open edit", async () => {
    const wrapper = await mountView();
    await editButtons(wrapper)[0]!.trigger("click");
    await selectRow(wrapper, 3);

    expect(field(wrapper, "purchase-amount").value).toBe("");
    expect(field(wrapper, "purchase-date").value).toBe(
      new Date().toLocaleDateString("en-GB")
    );

    // And Update posts a new purchase for the item now selected
    await setAmount(wrapper, "4");
    await button(wrapper, "Update").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(updatePurchase).not.toHaveBeenCalled();
    expect(postPurchase).toHaveBeenCalledWith({ productId: 3, quantity: 4 });
    wrapper.unmount();
  });

  it("posts on Enter in the amount field, same as the Update button", async () => {
    const wrapper = await mountView();
    await setAmount(wrapper, "25");

    await wrapper.find("#purchase-amount").trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(postPurchase).toHaveBeenCalledWith({ productId: 1, quantity: 25 });
    expect(field(wrapper, "purchase-amount").value).toBe("");
    wrapper.unmount();
  });

  it("ignores Enter while the amount is not postable", async () => {
    const wrapper = await mountView();
    await setAmount(wrapper, "0");

    await wrapper.find("#purchase-amount").trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(postPurchase).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("surfaces a failed post and keeps the amount", async () => {
    postPurchase.mockRejectedValueOnce(new Error("Product not found"));
    const wrapper = await mountView();
    await setAmount(wrapper, "25");
    await button(wrapper, "Update").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.text()).toContain("Product not found");
    expect(field(wrapper, "purchase-amount").value).toBe("25");
    wrapper.unmount();
  });

  it("traverses the list with the arrow keys and clears a typed amount", async () => {
    const wrapper = await mountView();
    const list = wrapper.find("div[tabindex='0']");

    // Focused on open, so arrows work without clicking the list first
    expect(document.activeElement).toBe(list.element);
    await setAmount(wrapper, "25");

    await list.trigger("keydown.down");
    await new Promise((r) => setTimeout(r, 0));
    expect(field(wrapper, "item-id").value).toBe("2");
    expect(field(wrapper, "purchase-amount").value).toBe("");

    await list.trigger("keydown.down");
    await new Promise((r) => setTimeout(r, 0));
    expect(field(wrapper, "item-id").value).toBe("3");
    expect(field(wrapper, "item-name").value).toBe("Item 3");
    expect(rows(wrapper)).toEqual([]);

    await list.trigger("keydown.up");
    expect(field(wrapper, "item-id").value).toBe("2");
    wrapper.unmount();
  });

  it("Close closes the window", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Close").trigger("click");
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
