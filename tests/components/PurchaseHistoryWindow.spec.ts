import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PurchaseHistory from "../../src/views/PurchaseHistory.vue";
import { currentLang } from "../../src/i18n";

type ProductStub = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

type PurchaseStub = { date: string; unit: string; quantity: number };

describe("Purchase history window", () => {
  const listProducts = vi.fn();
  const listProductPurchases = vi.fn();

  const purchases1: PurchaseStub[] = [
    { date: "2026-07-30T10:00:00.000Z", unit: "Bag", quantity: 120 },
    { date: "2026-07-15T10:00:00.000Z", unit: "Bag", quantity: 55 },
  ];

  beforeEach(() => {
    currentLang.value = "en";
    window.location.hash = "";
    listProducts.mockReset().mockResolvedValue([
      {
        id: 1,
        nameBn: "Item 1",
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
    listProductPurchases
      .mockReset()
      .mockImplementation(async (id: number) => (id === 1 ? purchases1 : []));
    (window as unknown as { ahb: unknown }).ahb = {
      listProducts,
      listProductPurchases,
      onDataChanged: vi.fn(() => () => undefined),
    };
  });

  async function mountView() {
    const wrapper = mount(PurchaseHistory, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const rows = (wrapper: View) =>
    wrapper
      .findAll('tr[data-row="purchase"]')
      .map((r) => r.findAll("td").map((c) => c.text()));

  it("lists every slot with its item name", async () => {
    const wrapper = await mountView();
    const items = wrapper.findAll("li[data-id]");

    expect(items.length).toBeGreaterThan(3);
    expect(items[0]!.text()).toContain("Item 1");
    expect(items[1]!.text().trim()).toBe("2");
    expect(items[2]!.text()).toContain("Item 3");
    wrapper.unmount();
  });

  it("shows the selected item's purchases newest-first", async () => {
    const wrapper = await mountView();

    expect(listProductPurchases).toHaveBeenCalledWith(1);
    expect(rows(wrapper)).toEqual([
      ["30/07/2026", "120", "Bag"],
      ["15/07/2026", "55", "Bag"],
    ]);
    wrapper.unmount();
  });

  it("labels the columns Date / Amount / Unit and centres every cell", async () => {
    const wrapper = await mountView();

    const heads = wrapper.findAll("th");
    expect(heads.map((h) => h.text())).toEqual(["Date", "Amount", "Unit"]);
    for (const h of heads) expect(h.classes()).toContain("text-center");

    const cells = wrapper.find('tr[data-row="purchase"]').findAll("td");
    for (const c of cells) expect(c.classes()).toContain("text-center");
    wrapper.unmount();
  });

  it("shows the empty state for an item with no purchases", async () => {
    const wrapper = await mountView();
    await wrapper.find('li[data-id="3"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(rows(wrapper)).toEqual([]);
    expect(wrapper.find("tbody").text()).toContain("No purchases");
    wrapper.unmount();
  });

  it("traverses the list with the arrow keys and loads each item's rows", async () => {
    const wrapper = await mountView();
    const list = wrapper.find("div[tabindex='0']");

    // Focused on open, so arrows work without clicking the list first
    expect(document.activeElement).toBe(list.element);

    await list.trigger("keydown.down");
    await new Promise((r) => setTimeout(r, 0));
    expect(listProductPurchases).toHaveBeenCalledWith(2);
    expect(rows(wrapper)).toEqual([]);

    await list.trigger("keydown.up");
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find("li[data-id='1']").classes()).toContain("bg-blue-100");
    expect(rows(wrapper)).toHaveLength(2);
    wrapper.unmount();
  });

  it("opens on the item id carried in the hash", async () => {
    window.location.hash = "#purchase-history/3";
    const wrapper = await mountView();

    expect(listProductPurchases).toHaveBeenCalledWith(3);
    expect(wrapper.find("li[data-id='3']").classes()).toContain("bg-blue-100");
    wrapper.unmount();
  });
});
