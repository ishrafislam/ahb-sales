import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SalesHistory from "../../src/views/SalesHistory.vue";
import { currentLang } from "../../src/i18n";

type ProductStub = { id: number; nameBn: string };

type SaleStub = {
  date: string;
  invoiceNo: number;
  productId: number;
  unit: string;
  quantity: number;
  rate: number;
  lineTotal: number;
  customerId: number;
  customerNameBn?: string;
};

describe("Sales history window", () => {
  const listProducts = vi.fn();
  const listProductSales = vi.fn();

  const sales1: SaleStub[] = [
    {
      date: "2026-07-30T10:00:00.000Z",
      invoiceNo: 12,
      productId: 1,
      unit: "Bag",
      quantity: 25,
      rate: 466,
      lineTotal: 11650,
      customerId: 100,
      customerNameBn: "Karim Store",
    },
    {
      date: "2026-07-15T10:00:00.000Z",
      invoiceNo: 9,
      productId: 1,
      unit: "Bag",
      quantity: 4,
      rate: 466,
      lineTotal: 1864,
      // Created from an empty slot: it has an id but no name yet
      customerId: 250,
    },
    {
      date: "2026-07-01T10:00:00.000Z",
      invoiceNo: 3,
      productId: 1,
      unit: "Bag",
      quantity: 2,
      rate: 460,
      lineTotal: 920,
      // Legacy anonymous invoice
      customerId: 0,
    },
  ];

  beforeEach(() => {
    currentLang.value = "en";
    window.location.hash = "";
    listProducts.mockReset().mockResolvedValue([
      { id: 1, nameBn: "Item 1" },
      { id: 3, nameBn: "Item 3" },
    ] as ProductStub[]);
    listProductSales
      .mockReset()
      .mockImplementation(async (id: number) => (id === 1 ? sales1 : []));
    (window as unknown as { ahb: unknown }).ahb = {
      listProducts,
      listProductSales,
      onDataChanged: vi.fn(() => () => undefined),
    };
  });

  async function mountView() {
    const wrapper = mount(SalesHistory, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const rows = (wrapper: View) =>
    wrapper
      .findAll('tr[data-row="grid"]')
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

  it("shows the selected item's sales, newest first", async () => {
    const wrapper = await mountView();

    expect(listProductSales).toHaveBeenCalledWith(1);
    expect(rows(wrapper)).toEqual([
      ["30/07/2026", "100", "Karim Store", "25"],
      // Customer created from an empty slot: id only, name still blank
      ["15/07/2026", "250", "", "4"],
      // Legacy anonymous invoice: plain 0, no "Walk-in" substitution
      ["01/07/2026", "0", "", "2"],
    ]);
    wrapper.unmount();
  });

  it("labels the four columns and centres every cell", async () => {
    const wrapper = await mountView();

    const heads = wrapper.findAll("th");
    expect(heads.map((h) => h.text())).toEqual([
      "Date",
      "Customer ID",
      "Customer Name",
      "Amount",
    ]);
    for (const h of heads) expect(h.classes()).toContain("text-center");

    const cells = wrapper.find('tr[data-row="grid"]').findAll("td");
    for (const c of cells) expect(c.classes()).toContain("text-center");
    wrapper.unmount();
  });

  it("shows the empty state for an item with no sales", async () => {
    const wrapper = await mountView();
    await wrapper.find('li[data-id="3"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(rows(wrapper)).toEqual([]);
    expect(wrapper.find("tbody").text()).toContain("No sales");
    wrapper.unmount();
  });

  it("traverses the list with the arrow keys and loads each item's rows", async () => {
    const wrapper = await mountView();
    const list = wrapper.find("div[tabindex='0']");

    // Focused on open, so arrows work without clicking the list first
    expect(document.activeElement).toBe(list.element);

    await list.trigger("keydown.down");
    await new Promise((r) => setTimeout(r, 0));
    expect(listProductSales).toHaveBeenCalledWith(2);
    expect(rows(wrapper)).toEqual([]);

    await list.trigger("keydown.up");
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find("li[data-id='1']").classes()).toContain("bg-blue-100");
    expect(rows(wrapper)).toHaveLength(3);
    wrapper.unmount();
  });

  it("opens on the item id carried in the hash", async () => {
    window.location.hash = "#sales-history/3";
    const wrapper = await mountView();

    expect(listProductSales).toHaveBeenCalledWith(3);
    expect(wrapper.find("li[data-id='3']").classes()).toContain("bg-blue-100");
    wrapper.unmount();
  });
});
