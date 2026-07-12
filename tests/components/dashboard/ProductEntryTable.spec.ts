import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, ref, nextTick } from "vue";
import ProductEntryTable, {
  type EntryRow,
} from "../../../src/components/dashboard/ProductEntryTable.vue";
import { currentLang } from "../../../src/i18n";

type ProductStub = {
  id: number;
  nameBn: string;
  unit: string;
  price: number;
};

describe("ProductEntryTable", () => {
  let getProductById: ReturnType<
    typeof vi.fn<(id: number) => Promise<ProductStub | null>>
  >;

  beforeEach(() => {
    currentLang.value = "en";
    getProductById = vi.fn(async (id: number) =>
      id === 5
        ? { id: 5, nameBn: "চাল", unit: "kg", price: 55.5 }
        : id === 7
          ? { id: 7, nameBn: "ডাল", unit: "kg", price: 120 }
          : null
    );
    (window as unknown as { ahb: unknown }).ahb = { getProductById };
  });

  const Host = defineComponent({
    components: { ProductEntryTable },
    setup() {
      const rows = ref<EntryRow[]>([]);
      const table = ref<InstanceType<typeof ProductEntryTable> | null>(null);
      return { rows, table };
    },
    template: `<ProductEntryTable ref="table" v-model:rows="rows" />`,
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
    return { id: inputs[0]!, amount: inputs[1]! };
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
    expect(rowText).toContain("55.50");
    expect(document.activeElement).toBe(amount.element);
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

  it("re-entering an existing product ID jumps to that row's amount", async () => {
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

    expect(getProductById).not.toHaveBeenCalled();
    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(document.activeElement).toBe(cellInputs(wrapper, 0).amount.element);
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

  it("navigates between cells with arrow keys and selects the value", async () => {
    const wrapper = mountHost();
    await startEntry(wrapper);
    const first = cellInputs(wrapper, 0);
    await first.id.setValue("5");
    await first.id.trigger("keydown.enter");
    await flush();
    await first.amount.setValue("3");
    await first.amount.trigger("keydown.enter");
    await flush();

    // From second row's ID, ArrowUp goes to first row's ID
    const second = cellInputs(wrapper, 1);
    await second.id.trigger("keydown", { key: "ArrowUp" });
    await flush();
    expect(document.activeElement).toBe(first.id.element);

    // ArrowRight moves to the amount cell; the value is selected
    await first.id.trigger("keydown", { key: "ArrowRight" });
    await flush();
    const amountEl = first.amount.element as HTMLInputElement;
    expect(document.activeElement).toBe(amountEl);
    expect(amountEl.selectionStart).toBe(0);
    expect(amountEl.selectionEnd).toBe(amountEl.value.length);

    // ArrowLeft back to ID, ArrowDown to the next row's ID
    await first.amount.trigger("keydown", { key: "ArrowLeft" });
    await flush();
    expect(document.activeElement).toBe(first.id.element);
    await first.id.trigger("keydown", { key: "ArrowDown" });
    await flush();
    expect(document.activeElement).toBe(second.id.element);
    wrapper.unmount();
  });
});
