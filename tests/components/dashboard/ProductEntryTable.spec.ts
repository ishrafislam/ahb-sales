import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref, nextTick } from "vue";
import ProductEntryTable, {
  type EntryRow,
} from "../../../src/components/dashboard/ProductEntryTable.vue";
import { currentLang } from "../../../src/i18n";
import { MAX_PRODUCT_ID } from "../../../src/constants/business";

type ProductStub = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
  stock: number;
};

describe("ProductEntryTable", () => {
  let getProductById: ReturnType<
    typeof vi.fn<(id: number) => Promise<ProductStub | null>>
  >;
  let listProducts: ReturnType<typeof vi.fn>;
  const writeClipboardText = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    getProductById = vi.fn(async (id: number) =>
      id === 5
        ? { id: 5, nameBn: "চাল", unit: "kg", price: 55.5, stock: 40 }
        : id === 7
          ? { id: 7, nameBn: "ডাল", unit: "kg", price: 120, stock: 12 }
          : null
    );
    listProducts = vi.fn(async () => [
      { id: 5, nameBn: "চাল", description: "মোটা", unit: "kg", price: 55.5, stock: 40 },
      { id: 7, nameBn: "ডাল", unit: "kg", price: 120, stock: 12 },
    ]);
    writeClipboardText.mockReset().mockResolvedValue(undefined);
    (window as unknown as { ahb: unknown }).ahb = {
      getProductById,
      listProducts,
      writeClipboardText,
    };
  });

  const Host = defineComponent({
    components: { ProductEntryTable },
    setup() {
      const rows = ref<EntryRow[]>([]);
      const table = ref<InstanceType<typeof ProductEntryTable> | null>(null);
      const selected = ref<Array<{ id: number; stock: number } | null>>([]);
      const locked = ref(false);
      const leftCount = ref(0);
      const onProductSelected = (p: { id: number; stock: number } | null) =>
        selected.value.push(p);
      const onLeaveLeft = () => (leftCount.value += 1);
      return {
        rows,
        table,
        selected,
        locked,
        leftCount,
        onProductSelected,
        onLeaveLeft,
      };
    },
    template: `<ProductEntryTable ref="table" v-model:rows="rows" :locked="locked" @product-selected="onProductSelected" @leave-left="onLeaveLeft" />`,
  });

  function mountHost() {
    return mount(Host, { attachTo: document.body });
  }

  async function flush() {
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
  }

  function cellInputs(wrapper: ReturnType<typeof mountHost>, rowIdx: number) {
    const row = wrapper.findAll("tbody tr")[rowIdx];
    expect(row, `row ${rowIdx} not found`).toBeTruthy();
    const inputs = row!.findAll("input");
    return { id: inputs[0]!, amount: inputs[1]!, price: inputs[2]! };
  }

  async function startEntry(wrapper: ReturnType<typeof mountHost>) {
    wrapper.vm.table!.startEntry();
    await flush();
  }

  it("startEntry adds one row and focuses its ID input", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    expect(wrapper.findAll("tbody tr").length).toBe(1);
    expect(document.activeElement).toBe(cellInputs(wrapper, 0).id.element);
    // Price is not editable until a product is loaded
    expect(
      (cellInputs(wrapper, 0).price.element as HTMLInputElement).disabled
    ).toBe(true);
    wrapper.unmount();
  });

  it("Enter on a valid ID loads the product and focuses the amount", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const { id, amount } = cellInputs(wrapper, 0);
    await id.setValue("5");
    await id.trigger("keydown.enter");
    await flush();

    expect(getProductById).toHaveBeenCalledWith(5);
    const rowText = wrapper.findAll("tbody tr")[0]!.text();
    expect(rowText).toContain("চাল");
    expect(rowText).toContain("kg");
    const priceEl = cellInputs(wrapper, 0).price.element as HTMLInputElement;
    expect(priceEl.value).toBe("55.50");
    expect(priceEl.disabled).toBe(false);
    expect(document.activeElement).toBe(amount.element);
    // Focus-driven: null for the initial empty row, product once loaded
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });
    wrapper.unmount();
  });

  it("loading a product by ID appends the next row straight away", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const { id } = cellInputs(wrapper, 0);
    await id.setValue("5");
    await id.trigger("keydown.enter");
    await flush();

    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(wrapper.vm.rows[1]!.product).toBeNull();
    // The amount is still where entry carries on
    expect(document.activeElement).toBe(cellInputs(wrapper, 0).amount.element);
    wrapper.unmount();
  });

  it("takes an id typed in Bengali digits", async () => {
    currentLang.value = "bn";
    const wrapper = mountHost();
    await startEntry(wrapper);
    const { id, amount } = cellInputs(wrapper, 0);

    await id.setValue("৫");
    await id.trigger("keydown.enter");
    await flush();

    expect(getProductById).toHaveBeenCalledWith(5);
    // And the loaded id reads back in Bengali
    expect((cellInputs(wrapper, 0).id.element as HTMLInputElement).value).toBe(
      "৫"
    );

    await amount.setValue("২.৫");
    await amount.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.rows[0]!.amountText).toBe("2.5");
    currentLang.value = "en";
    wrapper.unmount();
  });

  it("blurring the ID cell loads the product, and a bad id clears it", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await cellInputs(wrapper, 0).id.setValue("7");
    await cellInputs(wrapper, 0).id.trigger("blur");
    await flush();

    expect(wrapper.vm.rows[0]!.product).toMatchObject({ id: 7, nameBn: "ডাল" });
    expect(wrapper.findAll("tbody tr").length).toBe(2);

    // An id naming nothing goes back to the product the row already holds
    await cellInputs(wrapper, 0).id.setValue("999");
    await cellInputs(wrapper, 0).id.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.idText).toBe("7");
    expect(wrapper.vm.rows[0]!.product).toMatchObject({ id: 7 });

    // On a row with nothing loaded it simply clears
    await cellInputs(wrapper, 1).id.setValue("999");
    await cellInputs(wrapper, 1).id.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[1]!.idText).toBe("");
    expect(wrapper.vm.rows[1]!.product).toBeNull();
    wrapper.unmount();
  });

  it("blurring an unchanged ID leaves a hand-edited price alone", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.price.setValue("60");
    await first.price.trigger("keydown.enter");
    await flush();

    getProductById.mockClear();
    await first.id.trigger("blur");
    await flush();

    expect(getProductById).not.toHaveBeenCalled();
    expect(wrapper.vm.rows[0]!.price).toBe(60);
    expect(wrapper.vm.rows[0]!.priceText).toBe("60.00");
    wrapper.unmount();
  });

  it("blurring the amount keeps a real quantity and clears the rest", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();

    await first.amount.setValue("3");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.amountText).toBe("3");
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });

    await first.amount.setValue("abc");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.amountText).toBe("");

    await first.amount.setValue("-2");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.amountText).toBe("");
    // Nothing sold, so the header is back at the stored stock
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });
    wrapper.unmount();
  });

  it("a quantity of 0 is kept and drives the price to nothing", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();

    await first.amount.setValue("0");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.amountText).toBe("0");
    expect(wrapper.vm.rows[0]!.price).toBe(0);
    expect(wrapper.vm.rows[0]!.priceText).toBe("0.00");
    // Nothing leaves the shelf for a free item
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });

    // Coming back off zero restores the catalog price
    await first.amount.setValue("2");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(55.5);
    expect(wrapper.vm.rows[0]!.priceText).toBe("55.50");

    // A price typed by hand survives a later zero-then-back round trip
    await first.price.setValue("60");
    await first.price.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("0");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(0);
    await first.amount.setValue("2");
    await first.amount.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(55.5);
    wrapper.unmount();
  });

  it("Enter in a price walks down the price column", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    for (const [idx, id] of [[0, "5"], [1, "7"]] as const) {
      const cells = cellInputs(wrapper, idx);
      await cells.id.setValue(id);
      await cells.id.trigger("keydown.enter");
      await flush();
      await cells.amount.setValue("2");
      await cells.amount.trigger("keydown.enter");
      await flush();
    }
    expect(wrapper.findAll("tbody tr").length).toBe(3);

    // Row 0's price commits and hands over to row 1's price
    const first = cellInputs(wrapper, 0);
    (first.price.element as HTMLInputElement).focus();
    await first.price.setValue("60");
    await first.price.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(60);
    expect(document.activeElement).toBe(cellInputs(wrapper, 1).price.element);

    // The trailing row has no product, so entry drops into its ID cell
    await cellInputs(wrapper, 1).price.trigger("keydown.enter");
    await flush();
    expect(document.activeElement).toBe(cellInputs(wrapper, 2).id.element);
    wrapper.unmount();
  });

  it("Enter on a valid amount appends a row and focuses its ID", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();

    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(document.activeElement).toBe(cellInputs(wrapper, 1).id.element);
    wrapper.unmount();
  });

  it("shows the projected stock in the header after QTY Enter, not before", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    // Product loaded, no amount yet: full stock
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });

    // Typing an amount alone does not update the header
    await first.amount.setValue("3");
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });

    // Enter commits: header shows stock minus the amount and keeps it
    // while the next row's empty ID cell is focused
    await first.amount.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });
    expect(document.activeElement).toBe(cellInputs(wrapper, 1).id.element);

    // An invalid amount re-focuses the cell; the projection counts no sale
    await first.amount.setValue("0");
    await first.amount.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 40 });

    // Fractional amounts project without float noise
    await first.amount.setValue("2.5");
    await first.amount.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37.5 });
    wrapper.unmount();
  });

  // A row restored from a posted invoice: the sale is already inside the
  // stored stock, so the header must not take it off a second time.
  function postedRow(stock: number, quantity: number): EntryRow {
    return {
      key: -1,
      idText: "5",
      product: { id: 5, nameBn: "চাল", unit: "kg", price: 55.5, stock },
      amountText: String(quantity),
      appliedQty: quantity,
      priceText: "55.50",
      price: 55.5,
    };
  }

  it("reports the stored stock for a row the invoice already accounts for", async () => {
    const wrapper = mountHost();
    // 0 in stock, 5 sold, 50 bought back in
    wrapper.vm.rows = [postedRow(45, 5)];
    await flush();

    await cellInputs(wrapper, 0).amount.trigger("focus");
    await flush();

    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 45 });
    wrapper.unmount();
  });

  it("projects only the change when an accounted-for amount is edited", async () => {
    const wrapper = mountHost();
    wrapper.vm.rows = [postedRow(45, 5)];
    await flush();

    const amount = cellInputs(wrapper, 0).amount;
    await amount.setValue("8");
    await amount.trigger("keydown.enter");
    await flush();

    // Posting the edit reverts the old 5 and applies the new 8
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 42 });
    wrapper.unmount();
  });

  it("refreshProductStock follows a purchase posted elsewhere", async () => {
    const wrapper = mountHost();
    wrapper.vm.rows = [postedRow(45, 5)];
    await flush();
    await cellInputs(wrapper, 0).amount.trigger("focus");
    await flush();

    wrapper.vm.table!.refreshProductStock(5, 95);
    await flush();

    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 95 });
    // A product no row holds leaves the header alone
    wrapper.vm.table!.refreshProductStock(7, 3);
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 95 });
    wrapper.unmount();
  });

  it("takes the same product on a second, independent row", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();

    getProductById.mockClear();
    const second = cellInputs(wrapper, 1);
    await second.id.setValue("5");
    await second.id.trigger("keydown.enter");
    await flush();

    // The row loads the product like any other, and focus lands on its own
    // amount cell rather than jumping back to the first row
    expect(getProductById).toHaveBeenCalledWith(5);
    expect(document.activeElement).toBe(cellInputs(wrapper, 1).amount.element);

    await cellInputs(wrapper, 1).amount.setValue("2");
    await cellInputs(wrapper, 1).amount.trigger("keydown.enter");
    await flush();

    // Two lines of the same product, each keeping its own quantity
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(3);
    expect(cellInputs(wrapper, 0).amount.element.value).toBe("3");
    expect(cellInputs(wrapper, 1).amount.element.value).toBe("2");
    wrapper.unmount();
  });

  describe("the ID slot dropdown", () => {
    const panelRows = () =>
      Array.from(document.querySelectorAll('[data-role="slot-option"]'));

    const caret = (wrapper: ReturnType<typeof mountHost>, rowIdx: number) =>
      wrapper.findAll('[data-role="slots-toggle"]')[rowIdx]!;

    it("browses every slot again once the row holds its product", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      const first = cellInputs(wrapper, 0);

      // Typing filters: 5, 50-59, 500-599
      await first.id.setValue("5");
      await caret(wrapper, 0).trigger("click");
      await flush();
      expect(panelRows().length).toBe(111);

      // Enter commits the product, so the cell is settled
      await first.id.trigger("keydown.enter");
      await flush();
      await caret(wrapper, 0).trigger("click");
      await flush();
      expect(panelRows().length).toBe(MAX_PRODUCT_ID);

      // Typing over it searches again: 7, 70-79, 700-799
      await first.id.setValue("7");
      await flush();
      expect(panelRows().length).toBe(111);
      wrapper.unmount();
    });

    it("keeps filtering a cell whose text names no product", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      await cellInputs(wrapper, 0).id.setValue("9");
      await caret(wrapper, 0).trigger("click");
      await flush();

      // 9, 90-99, 900-999
      expect(panelRows().length).toBe(111);
      wrapper.unmount();
    });

    it("stays shut until the caret is clicked, then lists every slot", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      await flush();
      // Focus alone leaves it closed: the arrows walk the rows
      expect(panelRows()).toHaveLength(0);

      await caret(wrapper, 0).trigger("click");
      await flush();

      expect(listProducts).toHaveBeenCalled();
      expect(panelRows().length).toBe(MAX_PRODUCT_ID);
      const first = panelRows()[4]!.textContent ?? "";
      expect(first).toContain("চাল");
      expect(first).toContain("মোটা");
      expect(panelRows()[0]!.textContent).toContain("Empty Slot");
      wrapper.unmount();
    });

    it("filters an open list as the id is typed, and never opens one", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      const id = cellInputs(wrapper, 0).id;

      await id.setValue("7");
      await id.trigger("input");
      await flush();
      expect(panelRows()).toHaveLength(0);

      await caret(wrapper, 0).trigger("click");
      await flush();

      // 7, 70-79, 700-799
      expect(panelRows().length).toBe(111);
      expect(panelRows()[0]!.textContent).toContain("ডাল");
      wrapper.unmount();
    });

    it("loads the clicked product and closes", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      const id = cellInputs(wrapper, 0).id;
      await caret(wrapper, 0).trigger("click");
      await flush();

      (panelRows()[4] as HTMLElement).click();
      await flush();

      expect(getProductById).toHaveBeenCalledWith(5);
      expect((id.element as HTMLInputElement).value).toBe("5");
      expect(document.activeElement).toBe(cellInputs(wrapper, 0).amount.element);
      expect(panelRows()).toHaveLength(0);
      wrapper.unmount();
    });

    it("leaves the arrows to row navigation, open or not, and closes on Escape", async () => {
      const wrapper = mountHost();
      await startEntry(wrapper);
      const first = cellInputs(wrapper, 0);
      await first.id.setValue("5");
      await first.id.trigger("keydown.enter");
      await flush();
      await first.amount.setValue("1");
      await first.amount.trigger("keydown.enter");
      await flush();

      const second = cellInputs(wrapper, 1);
      await caret(wrapper, 1).trigger("click");
      await flush();
      expect(panelRows().length).toBeGreaterThan(0);

      // Still walks the rows with the panel showing
      await second.id.trigger("keydown", { key: "ArrowUp" });
      await flush();
      expect(document.activeElement).toBe(cellInputs(wrapper, 0).id.element);

      await cellInputs(wrapper, 0).id.trigger("keydown", { key: "Escape" });
      await flush();
      expect(panelRows()).toHaveLength(0);
      wrapper.unmount();
    });
  });

  it("locked makes every cell read-only, still walkable, and commits nothing", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();
    const second = cellInputs(wrapper, 1);
    await second.id.setValue("7");
    await second.id.trigger("keydown.enter");
    await flush();

    wrapper.vm.locked = true;
    await flush();

    // Read-only rather than disabled: a posted invoice can be read through
    for (const cell of Object.values(cellInputs(wrapper, 0))) {
      const el = cell.element as HTMLInputElement;
      expect(el.disabled).toBe(false);
      expect(el.readOnly).toBe(true);
    }
    // The catalog stays shut
    expect(
      (wrapper.find('[data-role="slots-toggle"]').element as HTMLButtonElement)
        .disabled
    ).toBe(true);

    // Arrows still walk the rows, and the header follows
    (cellInputs(wrapper, 0).id.element as HTMLInputElement).focus();
    await flush();
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });
    await cellInputs(wrapper, 0).id.trigger("keydown", { key: "ArrowDown" });
    await flush();
    expect(document.activeElement).toBe(cellInputs(wrapper, 1).id.element);
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 7, stock: 12 });

    // Enter changes nothing, and no row is added
    getProductById.mockClear();
    const rowCount = wrapper.vm.rows.length;
    await cellInputs(wrapper, 0).amount.setValue("99");
    await cellInputs(wrapper, 0).amount.trigger("keydown.enter");
    await cellInputs(wrapper, 0).price.setValue("1");
    await cellInputs(wrapper, 0).price.trigger("blur");
    await flush();
    expect(wrapper.vm.rows.length).toBe(rowCount);
    expect(wrapper.vm.rows[0]!.price).toBe(55.5);
    expect(getProductById).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps focus in the ID field for an unknown or invalid ID", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const { id } = cellInputs(wrapper, 0);

    await id.setValue("999");
    await id.trigger("keydown.enter");
    await flush();
    expect(document.activeElement).toBe(id.element);

    await id.setValue("abc");
    await id.trigger("keydown.enter");
    await flush();
    expect(document.activeElement).toBe(id.element);
    expect(getProductById).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("navigates ID and amount cells with arrow keys, never reaching price", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();

    // Amount Enter keeps the entered product's projected stock visible
    // even though the appended empty row got focus
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });

    // From second row's ID, ArrowUp goes to first row's ID and the
    // header info follows the focused row's product (projected stock)
    const second = cellInputs(wrapper, 1);
    await second.id.trigger("keydown", { key: "ArrowUp" });
    await flush();
    expect(document.activeElement).toBe(first.id.element);
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });

    // ArrowRight moves to the amount cell; the value is selected
    await first.id.trigger("keydown", { key: "ArrowRight" });
    await flush();
    const amountEl = first.amount.element as HTMLInputElement;
    expect(document.activeElement).toBe(amountEl);
    expect(amountEl.selectionStart).toBe(0);
    expect(amountEl.selectionEnd).toBe(amountEl.value.length);

    // ArrowRight from the amount does NOT reach the price cell
    await first.amount.trigger("keydown", { key: "ArrowRight" });
    await flush();
    expect(document.activeElement).toBe(amountEl);

    // ArrowLeft back to ID, ArrowDown to the next row's ID
    await first.amount.trigger("keydown", { key: "ArrowLeft" });
    await flush();
    expect(document.activeElement).toBe(first.id.element);
    await first.id.trigger("keydown", { key: "ArrowDown" });
    await flush();
    expect(document.activeElement).toBe(second.id.element);
    wrapper.unmount();
  });

  it("ArrowLeft on the ID cell hands the caret back to the parent", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();

    // Amount → ID stays inside the grid and reports nothing
    await first.amount.trigger("keydown", { key: "ArrowLeft" });
    await flush();
    expect(document.activeElement).toBe(first.id.element);
    expect(wrapper.vm.leftCount).toBe(0);

    // ID is the left edge: the parent is asked to take the caret
    await first.id.trigger("keydown", { key: "ArrowLeft" });
    await flush();
    expect(wrapper.vm.leftCount).toBe(1);
    // The grid moved nothing itself
    expect(document.activeElement).toBe(first.id.element);
    wrapper.unmount();
  });

  it("ArrowLeft closes the ID dropdown on its way out", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await wrapper.findAll('[data-role="slots-toggle"]')[0]!.trigger("click");
    await flush();
    expect(document.querySelector('[data-role="slot-dropdown"]')).toBeTruthy();

    await first.id.trigger("keydown", { key: "ArrowLeft" });
    await flush();
    expect(document.querySelector('[data-role="slot-dropdown"]')).toBeNull();
    expect(wrapper.vm.leftCount).toBe(1);
    wrapper.unmount();
  });

  function gutterButton(wrapper: ReturnType<typeof mountHost>, rowIdx: number) {
    return wrapper.findAll("tbody tr")[rowIdx]!.find("button.row-selector");
  }

  async function enterProductRow(
    wrapper: ReturnType<typeof mountHost>,
    rowIdx: number,
    id: string,
    amount: string
  ) {
    const cells = cellInputs(wrapper, rowIdx);
    await cells.id.setValue(id);
    await cells.id.trigger("keydown.enter");
    await flush();
    await cells.amount.setValue(amount);
    await cells.amount.trigger("keydown.enter");
    await flush();
  }

  it("selects a row from the gutter and deletes it with the Delete key", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    await enterProductRow(wrapper, 1, "7", "2");
    expect(wrapper.findAll("tbody tr").length).toBe(3);

    // The fresh entry row cannot be selected: its gutter is disabled
    const emptyGutter = gutterButton(wrapper, 2);
    expect(emptyGutter.text()).toBe("");
    expect((emptyGutter.element as HTMLButtonElement).disabled).toBe(true);
    await emptyGutter.trigger("click");
    expect(emptyGutter.text()).toBe("");

    // Click the first row's gutter: marker + highlight move there, and the
    // header shows that product's projected stock (product 5, amount 3,
    // stock 40 → 37)
    await gutterButton(wrapper, 0).trigger("click");
    expect(gutterButton(wrapper, 0).text()).toBe("►");
    expect(wrapper.findAll("tbody tr")[0]!.classes()).toContain("bg-blue-50");
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });

    // Clicking the selected gutter again deselects the row
    await gutterButton(wrapper, 0).trigger("click");
    expect(gutterButton(wrapper, 0).text()).toBe("");
    expect(wrapper.findAll("tbody tr")[0]!.classes()).not.toContain(
      "bg-blue-50"
    );

    // Selection moves on clicking another gutter
    await gutterButton(wrapper, 0).trigger("click");
    await gutterButton(wrapper, 1).trigger("click");
    expect(gutterButton(wrapper, 0).text()).toBe("");
    expect(gutterButton(wrapper, 1).text()).toBe("►");

    // Delete removes the selected row (product 7); the draft shrinks
    await gutterButton(wrapper, 1).trigger("keydown", { key: "Delete" });
    await flush();
    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(wrapper.vm.rows.map((r) => r.product?.id)).toEqual([5, undefined]);
    expect(gutterButton(wrapper, 0).text()).toBe("");
    expect(gutterButton(wrapper, 1).text()).toBe("");

    // Delete again without a selection does nothing
    await gutterButton(wrapper, 0).trigger("keydown", { key: "Delete" });
    await flush();
    expect(wrapper.findAll("tbody tr").length).toBe(2);
    wrapper.unmount();
  });

  it("deleting the only row leaves a fresh empty row with focus in its ID", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const cells = cellInputs(wrapper, 0);
    await cells.id.setValue("5");
    await cells.id.trigger("keydown.enter");
    await flush();
    await cells.amount.setValue("3");

    await gutterButton(wrapper, 0).trigger("click");
    await gutterButton(wrapper, 0).trigger("keydown", { key: "Delete" });
    await flush();

    expect(wrapper.findAll("tbody tr").length).toBe(1);
    expect(wrapper.vm.rows[0]!.product).toBeNull();
    expect(wrapper.vm.rows[0]!.idText).toBe("");
    expect(document.activeElement).toBe(cellInputs(wrapper, 0).id.element);
    wrapper.unmount();
  });

  it("picks several rows with Ctrl+click, and one plain click drops the rest", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    await enterProductRow(wrapper, 1, "7", "2");

    await gutterButton(wrapper, 0).trigger("click");
    await gutterButton(wrapper, 1).trigger("click", { ctrlKey: true });
    expect(gutterButton(wrapper, 0).text()).toBe("►");
    expect(gutterButton(wrapper, 1).text()).toBe("►");

    // Ctrl+click again takes that one back out
    await gutterButton(wrapper, 1).trigger("click", { ctrlKey: true });
    expect(gutterButton(wrapper, 1).text()).toBe("");

    // A plain click on the other row leaves only it picked
    await gutterButton(wrapper, 1).trigger("click");
    expect(gutterButton(wrapper, 0).text()).toBe("");
    expect(gutterButton(wrapper, 1).text()).toBe("►");
    wrapper.unmount();
  });

  it("drags a run of rows down the gutter", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    await enterProductRow(wrapper, 1, "7", "2");
    await enterProductRow(wrapper, 2, "5", "1");

    await gutterButton(wrapper, 0).trigger("mousedown");
    await gutterButton(wrapper, 1).trigger("mouseenter");
    await gutterButton(wrapper, 2).trigger("mouseenter");
    expect([0, 1, 2].map((i) => gutterButton(wrapper, i).text())).toEqual([
      "►",
      "►",
      "►",
    ]);

    // The empty trailing row is never dragged into the selection
    expect(gutterButton(wrapper, 3).text()).toBe("");

    // Once the button is up, moving over another row changes nothing
    window.dispatchEvent(new MouseEvent("mouseup"));
    await gutterButton(wrapper, 3).trigger("mouseenter");
    expect(gutterButton(wrapper, 0).text()).toBe("►");
    wrapper.unmount();
  });

  it("Delete removes every picked row at once", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    await enterProductRow(wrapper, 1, "7", "2");
    await enterProductRow(wrapper, 2, "5", "1");
    expect(wrapper.findAll("tbody tr").length).toBe(4);

    await gutterButton(wrapper, 0).trigger("click");
    await gutterButton(wrapper, 2).trigger("click", { ctrlKey: true });
    await gutterButton(wrapper, 0).trigger("keydown", { key: "Delete" });
    await flush();

    // The middle row and the trailing empty one are what is left
    expect(wrapper.vm.rows.map((r: EntryRow) => r.product?.id)).toEqual([
      7,
      undefined,
    ]);
    wrapper.unmount();
  });

  it("Ctrl+C puts the picked rows on the clipboard, except inside a cell", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    await enterProductRow(wrapper, 1, "7", "2");

    await gutterButton(wrapper, 0).trigger("click");
    await gutterButton(wrapper, 1).trigger("click", { ctrlKey: true });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", ctrlKey: true })
    );
    await flush();
    expect(writeClipboardText).toHaveBeenCalledWith("5\tচাল\t3\tkg\n7\tডাল\t2\tkg");

    // Ctrl+C in a cell still means the text the user highlighted there
    writeClipboardText.mockClear();
    await cellInputs(wrapper, 0).amount.trigger("keydown", {
      key: "c",
      ctrlKey: true,
    });
    await flush();
    expect(writeClipboardText).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("copies from a posted invoice too", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");
    wrapper.vm.locked = true;
    await flush();

    await gutterButton(wrapper, 0).trigger("click");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", ctrlKey: true })
    );
    await flush();

    expect(writeClipboardText).toHaveBeenCalledWith("5\tচাল\t3\tkg");
    wrapper.unmount();
  });

  it("a locked grid still selects, but Delete does nothing", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    await enterProductRow(wrapper, 0, "5", "3");

    await gutterButton(wrapper, 0).trigger("click");
    expect(gutterButton(wrapper, 0).text()).toBe("►");

    wrapper.vm.locked = true;
    await flush();

    // A posted invoice is still worth picking rows out of, to copy them
    expect(
      (gutterButton(wrapper, 0).element as HTMLButtonElement).disabled
    ).toBe(false);
    expect(gutterButton(wrapper, 0).text()).toBe("►");

    await gutterButton(wrapper, 0).trigger("keydown", { key: "Delete" });
    await flush();
    expect(wrapper.findAll("tbody tr").length).toBe(2);
    wrapper.unmount();
  });

  it("renders bordered cells", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    expect(wrapper.find("table").classes()).toContain("border-collapse");
    for (const cell of wrapper.findAll("th, td")) {
      expect(cell.classes()).toContain("border");
    }
    wrapper.unmount();
  });

  it("price cell is click-editable but arrow keys do not navigate from it", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();

    // Click into the first row's price: editable, header follows
    (first.price.element as HTMLInputElement).focus();
    await flush();
    expect(document.activeElement).toBe(first.price.element);
    expect(wrapper.vm.selected.at(-1)).toEqual({ id: 5, stock: 37 });

    // Typing alone does not commit; Enter does
    await first.price.setValue("60");
    expect(wrapper.vm.rows[0]!.price).toBe(55.5);
    await first.price.trigger("keydown.enter");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(60);
    expect(wrapper.vm.rows[0]!.priceText).toBe("60.00");

    // Blur commits the same way Enter does
    await first.price.setValue("99");
    await first.price.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(99);
    expect(wrapper.vm.rows[0]!.priceText).toBe("99.00");

    // Text that is not a price at all falls back to the committed one
    await first.price.setValue("abc");
    await first.price.trigger("blur");
    await flush();
    expect(wrapper.vm.rows[0]!.price).toBe(99);
    expect(wrapper.vm.rows[0]!.priceText).toBe("99.00");

    // Arrow keys inside the price cell do not move grid focus
    (first.price.element as HTMLInputElement).focus();
    await flush();
    for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      await first.price.trigger("keydown", { key });
      await flush();
      expect(document.activeElement).toBe(first.price.element);
    }
    wrapper.unmount();
  });
});
