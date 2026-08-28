import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import Dashboard from "../src/views/Dashboard.vue";
import { currentLang } from "../src/i18n";
import { MAX_CUSTOMER_ID } from "../src/constants/business";

type InvoiceStub = {
  date: string;
  totals: { subtotal: number; net: number };
};

describe("Dashboard v2 — customer ID quick entry", () => {
  let listInvoicesByCustomer: ReturnType<
    typeof vi.fn<(customerId: number) => Promise<InvoiceStub[]>>
  >;
  let getCustomerById: ReturnType<
    typeof vi.fn<
      (id: number) => Promise<{
        nameBn: string;
        address?: string;
        outstanding: number;
      } | null>
    >
  >;

  beforeEach(() => {
    currentLang.value = "en";
    listInvoicesByCustomer = vi.fn(async () => [] as InvoiceStub[]);
    getCustomerById = vi.fn(async () => null);
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getCustomerById,
    };
  });

  function mountDashboard() {
    return mount(Dashboard, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
  }

  function getCustomerIdInput(wrapper: ReturnType<typeof mountDashboard>) {
    const rows = wrapper
      .findAll("div")
      .filter(
        (d) => d.text().includes("Customer ID") && d.find("input").exists()
      );
    // Innermost matching div is the label+input row itself
    const row = rows[rows.length - 1];
    expect(row).toBeTruthy();
    return row!.find("input");
  }

  function getDisabledInputs(wrapper: ReturnType<typeof mountDashboard>) {
    return wrapper.findAll("input:disabled");
  }

  // The customer's name and address are editable, so they are not part of the
  // disabled set the assertions below sweep
  function customerField(
    wrapper: ReturnType<typeof mountDashboard>,
    which: "name" | "address"
  ) {
    return wrapper.find(`#customer-${which}`);
  }

  const customerValue = (
    wrapper: ReturnType<typeof mountDashboard>,
    which: "name" | "address"
  ) => (customerField(wrapper, which).element as HTMLInputElement).value;

  it("renders product info, last bill, totals and status fields as always-disabled inputs", () => {
    const wrapper = mountDashboard();
    const disabled = getDisabledInputs(wrapper);
    // 2 header + 2 last-bill + receivable + grand total + bill
    // + deposit + 7 status panel fields; name and address are editable
    expect(disabled.length).toBe(15);
    wrapper.unmount();
  });

  it("shows a read-only deposit of 0.00 from the start", () => {
    const wrapper = mountDashboard();
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).toContain("0.00");
    wrapper.unmount();
  });

  it("focuses and selects the customer ID input on mount", async () => {
    const wrapper = mountDashboard();
    await new Promise((r) => setTimeout(r, 0));
    const input = getCustomerIdInput(wrapper);
    expect(document.activeElement).toBe(input.element);
    const el = input.element as HTMLInputElement;
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(el.value.length);
    wrapper.unmount();
  });

  it("loads the latest invoice on Enter and fills both fields", async () => {
    listInvoicesByCustomer.mockResolvedValue([
      {
        date: "2026-07-05T10:00:00.000Z",
        totals: { subtotal: 120, net: 115.5 },
      },
      {
        date: "2026-06-01T10:00:00.000Z",
        totals: { subtotal: 50, net: 50 },
      },
    ]);
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(listInvoicesByCustomer).toHaveBeenCalledWith(12);
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).toContain(
      new Date("2026-07-05T10:00:00.000Z").toLocaleDateString("en-GB")
    );
    expect(values).toContain("115.50");
    wrapper.unmount();
  });

  it("shows — for a customer with no invoices", async () => {
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("7");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(listInvoicesByCustomer).toHaveBeenCalledWith(7);
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    // Grid started for the valid customer: its empty row's price input is
    // also disabled until a product loads; other empties are the
    // receivable, grand total, bill and the 7 status panel fields. The
    // deposit field always shows 0.00.
    expect(values).toEqual([
      "",
      "",
      "—",
      "—",
      ...Array(4).fill(""),
      "0.00",
      ...Array(7).fill(""),
    ]);
    wrapper.unmount();
  });

  it("shows — for an out-of-range or non-numeric ID without calling the API", async () => {
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("abc");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(listInvoicesByCustomer).not.toHaveBeenCalled();
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).toEqual([
      "",
      "",
      "—",
      "—",
      ...Array(3).fill(""),
      "0.00",
      ...Array(7).fill(""),
    ]);
    wrapper.unmount();
  });

  it("populates the customer info box on selection and clears it for unknown IDs", async () => {
    getCustomerById.mockResolvedValue({
      nameBn: "রহিম",
      address: "ঢাকা",
      outstanding: 250.5,
    });
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(getCustomerById).toHaveBeenCalledWith(12);
    let values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(customerValue(wrapper, "name")).toBe("রহিম");
    expect(customerValue(wrapper, "address")).toBe("ঢাকা");
    expect(values).toContain("250.50");

    // Unknown customer clears the box
    getCustomerById.mockResolvedValue(null);
    await input.setValue("13");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(customerValue(wrapper, "name")).toBe("");
    expect(values).not.toContain("250.50");
    wrapper.unmount();
  });

  describe("the Customer ID slot dropdown", () => {
    const panelRows = () =>
      Array.from(document.querySelectorAll('[data-role="slot-option"]'));

    beforeEach(() => {
      const listCustomers = vi.fn(async () => [
        { id: 3, nameBn: "রহিম", address: "ঢাকা" },
        { id: 30, nameBn: "করিম", address: "চট্টগ্রাম" },
      ]);
      (window as unknown as { ahb: Record<string, unknown> }).ahb = {
        listInvoicesByCustomer,
        getCustomerById,
        listCustomers,
      };
    });

    it("lists every slot when the caret is clicked, empty ones included", async () => {
      const wrapper = mountDashboard();
      await wrapper.find('[data-role="customer-slots-toggle"]').trigger("click");
      await new Promise((r) => setTimeout(r, 0));

      expect(panelRows().length).toBe(MAX_CUSTOMER_ID);
      const third = panelRows()[2]!.textContent ?? "";
      expect(third).toContain("রহিম");
      expect(third).toContain("ঢাকা");
      expect(panelRows()[0]!.textContent).toContain("Empty Slot");
      wrapper.unmount();
    });

    it("does not open on focus alone", async () => {
      const wrapper = mountDashboard();
      await getCustomerIdInput(wrapper).trigger("focus");
      await new Promise((r) => setTimeout(r, 0));

      expect(panelRows()).toHaveLength(0);
      wrapper.unmount();
    });

    it("selects the whole id on focus, ready to be typed over", async () => {
      const wrapper = mountDashboard();
      const input = getCustomerIdInput(wrapper);
      await input.setValue("214");
      const el = input.element as HTMLInputElement;
      el.setSelectionRange(3, 3);

      await input.trigger("focus");
      await new Promise((r) => setTimeout(r, 0));

      expect(el.selectionStart).toBe(0);
      expect(el.selectionEnd).toBe(3);
      wrapper.unmount();
    });

    it("filters an open list as the id is typed, and never opens one", async () => {
      const wrapper = mountDashboard();
      const input = getCustomerIdInput(wrapper);
      await input.setValue("3");
      await input.trigger("input");
      await new Promise((r) => setTimeout(r, 0));
      expect(panelRows()).toHaveLength(0);

      await wrapper.find('[data-role="customer-slots-toggle"]').trigger("click");
      await new Promise((r) => setTimeout(r, 0));

      // 3, 30-39, 300-399
      expect(panelRows().length).toBe(111);
      wrapper.unmount();
    });

    it("loads the highlighted customer on Enter", async () => {
      const wrapper = mountDashboard();
      const input = getCustomerIdInput(wrapper);
      await wrapper.find('[data-role="customer-slots-toggle"]').trigger("click");
      await new Promise((r) => setTimeout(r, 0));

      for (let i = 0; i < 3; i++)
        await input.trigger("keydown", { key: "ArrowDown" });
      await input.trigger("keydown", { key: "Enter" });
      await new Promise((r) => setTimeout(r, 0));

      expect(getCustomerById).toHaveBeenCalledWith(3);
      expect((input.element as HTMLInputElement).value).toBe("3");
      expect(panelRows()).toHaveLength(0);
      wrapper.unmount();
    });

    it("still loads the typed id when nothing is highlighted", async () => {
      const wrapper = mountDashboard();
      const input = getCustomerIdInput(wrapper);
      await input.setValue("30");
      await input.trigger("keydown", { key: "Enter" });
      await new Promise((r) => setTimeout(r, 0));

      expect(listInvoicesByCustomer).toHaveBeenCalledWith(30);
      wrapper.unmount();
    });
  });

  describe("editing the customer's name and address", () => {
    async function loadCustomer(
      wrapper: ReturnType<typeof mountDashboard>,
      id = "12"
    ) {
      const input = getCustomerIdInput(wrapper);
      await input.setValue(id);
      await input.trigger("keydown.enter");
      await new Promise((r) => setTimeout(r, 0));
    }

    function withApi(extra: Record<string, unknown>) {
      (window as unknown as { ahb: Record<string, unknown> }).ahb = {
        listInvoicesByCustomer,
        getCustomerById,
        ...extra,
      };
    }

    it("saves the name on Enter", async () => {
      const updateCustomer = vi.fn(async () => ({}));
      getCustomerById.mockResolvedValue({
        nameBn: "রহিম",
        address: "ঢাকা",
        outstanding: 10,
      });
      withApi({ updateCustomer });
      const wrapper = mountDashboard();
      await loadCustomer(wrapper);

      const name = customerField(wrapper, "name");
      await name.setValue("করিম");
      await name.trigger("keydown.enter");
      await new Promise((r) => setTimeout(r, 0));

      expect(updateCustomer).toHaveBeenCalledWith(12, {
        nameBn: "করিম",
        address: "ঢাকা",
      });
      wrapper.unmount();
    });

    it("saves on blur, and writes nothing when nothing changed", async () => {
      const updateCustomer = vi.fn(async () => ({}));
      getCustomerById.mockResolvedValue({
        nameBn: "রহিম",
        address: "ঢাকা",
        outstanding: 10,
      });
      withApi({ updateCustomer });
      const wrapper = mountDashboard();
      await loadCustomer(wrapper);

      // Focus and leave without typing
      await customerField(wrapper, "address").trigger("blur");
      await new Promise((r) => setTimeout(r, 0));
      expect(updateCustomer).not.toHaveBeenCalled();

      const address = customerField(wrapper, "address");
      await address.setValue("চট্টগ্রাম");
      await address.trigger("blur");
      await new Promise((r) => setTimeout(r, 0));

      expect(updateCustomer).toHaveBeenCalledWith(12, {
        nameBn: "রহিম",
        address: "চট্টগ্রাম",
      });
      wrapper.unmount();
    });

    it("creates the customer when the slot is empty, then updates it", async () => {
      const addCustomer = vi.fn(async () => ({}));
      const updateCustomer = vi.fn(async () => ({}));
      getCustomerById.mockResolvedValue(null);
      withApi({ addCustomer, updateCustomer });
      const wrapper = mountDashboard();
      await loadCustomer(wrapper, "77");

      const name = customerField(wrapper, "name");
      await name.setValue("নতুন");
      await name.trigger("keydown.enter");
      await new Promise((r) => setTimeout(r, 0));

      expect(addCustomer).toHaveBeenCalledWith({
        id: 77,
        nameBn: "নতুন",
        address: undefined,
      });

      // The record exists now, so the next edit patches it
      await name.setValue("নতুন দোকান");
      await name.trigger("keydown.enter");
      await new Promise((r) => setTimeout(r, 0));

      expect(addCustomer).toHaveBeenCalledTimes(1);
      expect(updateCustomer).toHaveBeenCalledWith(77, {
        nameBn: "নতুন দোকান",
        address: undefined,
      });
      wrapper.unmount();
    });

    it("creates nothing for an empty slot left blank", async () => {
      const addCustomer = vi.fn(async () => ({}));
      getCustomerById.mockResolvedValue(null);
      withApi({ addCustomer });
      const wrapper = mountDashboard();
      await loadCustomer(wrapper, "77");

      await customerField(wrapper, "name").trigger("blur");
      await new Promise((r) => setTimeout(r, 0));

      expect(addCustomer).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("shows a rejected save and puts the old value back", async () => {
      const updateCustomer = vi.fn(async () => {
        throw new Error("Customer not found");
      });
      getCustomerById.mockResolvedValue({
        nameBn: "রহিম",
        address: "ঢাকা",
        outstanding: 10,
      });
      withApi({ updateCustomer });
      const wrapper = mountDashboard();
      await loadCustomer(wrapper);

      const name = customerField(wrapper, "name");
      await name.setValue("করিম");
      await name.trigger("keydown.enter");
      await new Promise((r) => setTimeout(r, 0));

      expect(wrapper.text()).toContain("Customer not found");
      expect(customerValue(wrapper, "name")).toBe("রহিম");
      wrapper.unmount();
    });
  });

  it("starts product entry with one focused row after a valid customer Enter", async () => {
    const wrapper = mountDashboard();
    expect(wrapper.findAll("tbody tr").length).toBe(0);
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(document.activeElement).toBe(rows[0]!.find("input").element);
    wrapper.unmount();
  });

  it("does not start product entry for an invalid customer ID", async () => {
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("abc");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.findAll("tbody tr").length).toBe(0);
    wrapper.unmount();
  });

  it("updates the grand total from entered rows", async () => {
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock: 40,
    }));
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getProductById,
      getCustomerById,
    };
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    await rowInputs[0]!.setValue("5");
    await rowInputs[0]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await rowInputs[1]!.setValue("3");
    await new Promise((r) => setTimeout(r, 0));

    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).toContain("31.50");
    // Header panel shows the selected product's ID and stock
    expect(values[0]).toBe("5");
    expect(values[1]).toBe("40");

    // Editing the amount in place (no Enter) updates the grand total
    await rowInputs[1]!.setValue("2");
    await new Promise((r) => setTimeout(r, 0));
    let updated = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(updated).toContain("21.00");

    // Editing the price only affects the total once committed with Enter
    await rowInputs[2]!.setValue("5");
    await new Promise((r) => setTimeout(r, 0));
    updated = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(updated).toContain("21.00");
    await rowInputs[2]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    updated = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(updated).toContain("10.00");
    wrapper.unmount();
  });

  it("deleting a selected row recalculates the grand total", async () => {
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock: 40,
    }));
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getProductById,
      getCustomerById,
    };
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    await rowInputs[0]!.setValue("5");
    await rowInputs[0]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await rowInputs[1]!.setValue("2");
    await rowInputs[1]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    const disabledValues = () =>
      getDisabledInputs(wrapper).map(
        (i) => (i.element as HTMLInputElement).value
      );
    expect(disabledValues()).toContain("21.00");

    // Select the product row via the gutter and press Delete
    const gutter = wrapper
      .findAll("tbody tr")[0]!
      .find("button.row-selector");
    await gutter.trigger("click");
    await gutter.trigger("keydown", { key: "Delete" });
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.findAll("tbody tr").length).toBe(1);
    expect(disabledValues()).not.toContain("21.00");
    wrapper.unmount();
  });

  it("commits the discount on Enter and recalculates the bill", async () => {
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock: 40,
    }));
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getProductById,
      getCustomerById,
    };
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    await rowInputs[0]!.setValue("5");
    await rowInputs[0]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await rowInputs[1]!.setValue("2");
    await new Promise((r) => setTimeout(r, 0));

    const disabledValues = () =>
      getDisabledInputs(wrapper).map(
        (i) => (i.element as HTMLInputElement).value
      );
    // Bill mirrors the grand total (21.00) while no discount is committed
    expect(
      disabledValues().filter((v) => v === "21.00").length
    ).toBe(2);

    // Discount input: typing alone does not change the bill
    const discountRows = wrapper
      .findAll("div")
      .filter(
        (d) =>
          d.text().includes("Discount") &&
          d.find("input:not([disabled])").exists()
      );
    const discountInput = discountRows[discountRows.length - 1]!.find(
      "input:not([disabled])"
    );
    await discountInput.setValue("1");
    await new Promise((r) => setTimeout(r, 0));
    expect(disabledValues().filter((v) => v === "21.00").length).toBe(2);

    // Enter commits: bill drops to 20.00, draft normalized to 1.00
    await discountInput.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    expect(disabledValues()).toContain("20.00");
    expect((discountInput.element as HTMLInputElement).value).toBe("1.00");

    // A discount above the grand total is rejected on Enter
    await discountInput.setValue("9999");
    await discountInput.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    expect((discountInput.element as HTMLInputElement).value).toBe("1.00");
    expect(disabledValues()).toContain("20.00");
    wrapper.unmount();
  });

  async function setupPostableEntry(
    postInvoice: ReturnType<typeof vi.fn>,
    updateInvoice: ReturnType<typeof vi.fn> = vi.fn(),
    extraApi: Record<string, unknown> = {}
  ) {
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock: 40,
    }));
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getProductById,
      getCustomerById,
      postInvoice,
      updateInvoice,
      ...extraApi,
    };
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    await rowInputs[0]!.setValue("5");
    await rowInputs[0]!.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await rowInputs[1]!.setValue("2");

    const totalsInput = (label: string) => {
      const rows = wrapper
        .findAll("div")
        .filter(
          (d) =>
            d.text().includes(label) &&
            d.find("input:not([disabled])").exists()
        );
      return rows[rows.length - 1]!.find("input:not([disabled])");
    };
    await totalsInput("Discount").setValue("1");
    await totalsInput("Discount").trigger("keydown.enter");
    await wrapper.find("textarea").setValue("first purchase");

    const postButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Post Data")!;
    return { wrapper, postButton };
  }

  it("posts the invoice and shows the status, then locks the form", async () => {
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 5,
      previousDue: 100,
      currentDue: 115,
      notes: "first purchase",
    }));
    const { wrapper, postButton } = await setupPostableEntry(postInvoice);

    // Amount Enter appended a trailing empty row before posting
    await wrapper
      .findAll("tbody tr")[0]!
      .findAll("input")[1]!
      .trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.findAll("tbody tr").length).toBe(2);

    // Header stock shows the projection after this sale (40 - 2)
    const headerValues = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(headerValues[0]).toBe("5");
    expect(headerValues[1]).toBe("38");

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    // The trailing empty row is hidden after posting
    expect(wrapper.findAll("tbody tr").length).toBe(1);

    expect(postInvoice).toHaveBeenCalledWith({
      customerId: 12,
      createMissingCustomer: true,
      lines: [{ productId: 5, quantity: 2, rate: 10.5 }],
      discount: 1,
      paid: 0,
      notes: "first purchase",
    });

    // Status panel shows the returned invoice values
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    for (const v of ["1.00", "20.00", "5.00", "15.00", "100.00", "115.00"]) {
      expect(values).toContain(v);
    }
    expect(values.filter((v) => v === "21.00").length).toBeGreaterThanOrEqual(
      2
    );

    // Form is locked: grid cells, discount, deposit, comment, Post Data
    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    for (const cell of rowInputs) {
      expect((cell.element as HTMLInputElement).disabled).toBe(true);
    }
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).disabled
    ).toBe(true);
    expect((postButton.element as HTMLButtonElement).disabled).toBe(true);

    // A new customer session unlocks and clears the status
    const input = getCustomerIdInput(wrapper);
    await input.setValue("13");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect((postButton.element as HTMLButtonElement).disabled).toBe(false);
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).disabled
    ).toBe(false);
    wrapper.unmount();
  });

  it("posts to an empty customer slot and shows the new receivable", async () => {
    // No customer record at that ID: the main process creates it on post
    getCustomerById.mockResolvedValue(null);
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 0,
      previousDue: 0,
      currentDue: 20,
      notes: "first purchase",
    }));
    const { wrapper, postButton } = await setupPostableEntry(postInvoice);

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(postInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 12, createMissingCustomer: true })
    );
    // No "Customer not found" (or any other) error, and the customer info
    // box picks up the due the invoice just created
    expect(wrapper.find(".text-red-600").exists()).toBe(false);
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    // Customer info box: name, address, receivable
    expect(customerValue(wrapper, "name")).toBe("");
    expect(customerValue(wrapper, "address")).toBe("");
    expect(values[4]).toBe("20.00");
    expect((postButton.element as HTMLButtonElement).disabled).toBe(true);
    wrapper.unmount();
  });

  it("Edit unlocks the form and Post Data updates the same invoice", async () => {
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 5,
      previousDue: 100,
      currentDue: 115,
      notes: "first purchase",
    }));
    const updateInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 31.5, net: 30.5 },
      discount: 1,
      paid: 5,
      previousDue: 100,
      currentDue: 125.5,
      notes: "first purchase",
    }));
    const { wrapper, postButton } = await setupPostableEntry(
      postInvoice,
      updateInvoice
    );
    const editButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Edit")!;

    // Edit is disabled before any post
    expect((editButton.element as HTMLButtonElement).disabled).toBe(true);

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect((editButton.element as HTMLButtonElement).disabled).toBe(false);

    // Edit unlocks the grid and Post Data, and appends a fresh empty row
    // (the trailing row was pruned at post time) with focus in its ID
    await editButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    const gridRows = wrapper.findAll("tbody tr");
    expect(gridRows.length).toBe(2);
    const newRowId = gridRows[1]!.findAll("input")[0]!;
    expect((newRowId.element as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(newRowId.element);
    const rowInputs = gridRows[0]!.findAll("input");
    expect((rowInputs[0]!.element as HTMLInputElement).disabled).toBe(false);
    expect((postButton.element as HTMLButtonElement).disabled).toBe(false);
    expect((editButton.element as HTMLButtonElement).disabled).toBe(true);

    // Change the amount and save
    await rowInputs[1]!.setValue("3");
    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(postInvoice).toHaveBeenCalledTimes(1);
    expect(updateInvoice).toHaveBeenCalledWith("inv-1", {
      customerId: 12,
      createMissingCustomer: true,
      lines: [{ productId: 5, quantity: 3, rate: 10.5 }],
      discount: 1,
      paid: 5,
      notes: "first purchase",
    });

    // Status panel reflects the updated invoice; form locked again
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).toContain("30.50");
    expect(values).toContain("125.50");
    expect((postButton.element as HTMLButtonElement).disabled).toBe(true);
    expect((editButton.element as HTMLButtonElement).disabled).toBe(false);
    wrapper.unmount();
  });

  it("loads a same-day invoice into the locked posted state on customer Enter", async () => {
    const todayInvoice = {
      id: "inv-today",
      date: new Date().toISOString(),
      customerId: 12,
      lines: [
        {
          sn: 1,
          productId: 5,
          unit: "kg",
          quantity: 2,
          rate: 10.5,
          lineTotal: 21,
        },
      ],
      discount: 1,
      notes: "loaded note",
      totals: { subtotal: 21, net: 20 },
      paid: 8,
      previousDue: 100,
      currentDue: 112,
      payments: [
        {
          id: "p-1",
          date: new Date().toISOString(),
          amount: 8,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    listInvoicesByCustomer.mockResolvedValue([
      todayInvoice as unknown as InvoiceStub,
    ]);
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock: 40,
    }));
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer,
      getCustomerById,
      getProductById,
    };
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    // Grid shows exactly the invoice's line, locked (no trailing row)
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(1);
    const cells = rows[0]!.findAll("input");
    expect((cells[0]!.element as HTMLInputElement).value).toBe("5");
    expect((cells[1]!.element as HTMLInputElement).value).toBe("2");
    expect((cells[2]!.element as HTMLInputElement).value).toBe("10.50");
    for (const cell of cells) {
      expect((cell.element as HTMLInputElement).disabled).toBe(true);
    }
    expect(rows[0]!.text()).toContain("চাল");

    // Buttons reflect the posted state
    const button = (label: string) =>
      wrapper.findAll("button").find((b) => b.text() === label)!
        .element as HTMLButtonElement;
    expect(button("Post Data").disabled).toBe(true);
    expect(button("Edit").disabled).toBe(false);
    expect(button("Payment").disabled).toBe(false);

    // Status panel, deposit total and comment come from the invoice
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    for (const v of ["1.00", "20.00", "100.00", "112.00"]) {
      expect(values).toContain(v);
    }
    expect(values.filter((v) => v === "8.00").length).toBe(2);
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).value
    ).toBe("loaded note");
    wrapper.unmount();
  });

  it("starts an empty entry grid when the latest invoice is not from today", async () => {
    listInvoicesByCustomer.mockResolvedValue([
      {
        date: "2026-07-05T10:00:00.000Z",
        totals: { subtotal: 120, net: 115.5 },
      },
    ]);
    const wrapper = mountDashboard();
    const input = getCustomerIdInput(wrapper);
    await input.setValue("12");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(
      (rows[0]!.findAll("input")[0]!.element as HTMLInputElement).disabled
    ).toBe(false);
    expect(
      (rows[0]!.findAll("input")[0]!.element as HTMLInputElement).value
    ).toBe("");
    const postButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Post Data")!;
    expect((postButton.element as HTMLButtonElement).disabled).toBe(false);
    wrapper.unmount();
  });

  it("enables the Payment button only after posting and opens the payment window", async () => {
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 0,
      previousDue: 100,
      currentDue: 120,
      notes: "first purchase",
    }));
    const openPaymentWindow = vi.fn(async () => undefined);
    const { wrapper, postButton } = await setupPostableEntry(
      postInvoice,
      vi.fn(),
      { openPaymentWindow }
    );
    const paymentButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Payment")!;

    expect((paymentButton.element as HTMLButtonElement).disabled).toBe(true);
    await paymentButton.trigger("click");
    expect(openPaymentWindow).not.toHaveBeenCalled();

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect((paymentButton.element as HTMLButtonElement).disabled).toBe(false);
    await paymentButton.trigger("click");
    expect(openPaymentWindow).toHaveBeenCalledWith("inv-1");

    // Editing disables Payment again
    const editButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Edit")!;
    await editButton.trigger("click");
    expect((paymentButton.element as HTMLButtonElement).disabled).toBe(true);
    wrapper.unmount();
  });

  it("Single Print sends the posted receipt to the print preview", async () => {
    getCustomerById.mockResolvedValue({
      nameBn: "রহিম",
      address: "ঢাকা",
      outstanding: 100,
    });
    const invoice = {
      id: "inv-1",
      no: 42,
      date: "2026-07-30T10:00:00.000Z",
      customerId: 12,
      lines: [
        { productId: 5, quantity: 2, unit: "kg", rate: 10.5, lineTotal: 21 },
      ],
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 0,
      previousDue: 100,
      currentDue: 120,
      notes: "first purchase",
    };
    const postInvoice = vi.fn(async () => invoice);
    const openPrintPreview = vi.fn(async () => "job-1");
    const getInvoiceById = vi.fn(async () => invoice);
    const { wrapper, postButton } = await setupPostableEntry(
      postInvoice,
      vi.fn(),
      { openPrintPreview, getInvoiceById }
    );
    const singlePrint = wrapper
      .findAll("button")
      .find((b) => b.text() === "Single Print")!;

    // Nothing posted yet
    expect((singlePrint.element as HTMLButtonElement).disabled).toBe(true);
    await singlePrint.trigger("click");
    expect(openPrintPreview).not.toHaveBeenCalled();

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect((singlePrint.element as HTMLButtonElement).disabled).toBe(false);

    await singlePrint.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(getInvoiceById).toHaveBeenCalledWith("inv-1");
    expect(openPrintPreview).toHaveBeenCalledTimes(1);
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
    };
    expect(doc.title).toContain("42");
    // Product name and unit come from the entry rows, the customer from the form
    expect(doc.bodyHtml).toContain("চাল");
    expect(doc.bodyHtml).toContain("2 kg");
    expect(doc.bodyHtml).toContain("রহিম");
    wrapper.unmount();
  });

  it("leaves Direct Print and Select Print unwired", async () => {
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      no: 42,
      date: "2026-07-30T10:00:00.000Z",
      customerId: 12,
      lines: [],
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 0,
      previousDue: 100,
      currentDue: 120,
    }));
    const openPrintPreview = vi.fn(async () => "job-1");
    const { wrapper, postButton } = await setupPostableEntry(
      postInvoice,
      vi.fn(),
      { openPrintPreview, getInvoiceById: vi.fn() }
    );
    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    for (const label of ["Direct Print", "Select Print"]) {
      const btn = wrapper.findAll("button").find((b) => b.text() === label)!;
      expect(btn).toBeTruthy();
      await btn.trigger("click");
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(openPrintPreview).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("follows a stock change posted in another window", async () => {
    let dataChangedCb:
      | ((p: { kind: string; action: string; id: number }) => void)
      | null = null;
    const onDataChanged = vi.fn(
      (cb: (p: { kind: string; action: string; id: number }) => void) => {
        dataChangedCb = cb;
        return () => undefined;
      }
    );
    // The row's product is loaded at stock 40 by setupPostableEntry; a
    // purchase of 50 lands while the dashboard sits on it
    let stock = 40;
    const getProductById = vi.fn(async () => ({
      id: 5,
      nameBn: "চাল",
      unit: "kg",
      price: 10.5,
      stock,
    }));
    const { wrapper } = await setupPostableEntry(vi.fn(), vi.fn(), {
      onDataChanged,
      getProductById,
    });

    // Header follows the row: 40 stored, 2 about to be sold
    const stockValue = () =>
      getDisabledInputs(wrapper)
        .map((i) => (i.element as HTMLInputElement).value)
        .find((v) => v === "38" || v === "88");
    await wrapper.findAll("tbody tr")[0]!.findAll("input")[1]!.trigger("focus");
    await new Promise((r) => setTimeout(r, 0));
    expect(stockValue()).toBe("38");

    stock = 90;
    dataChangedCb!({ kind: "product", action: "stock-updated", id: 5 });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(getProductById).toHaveBeenCalledWith(5);
    expect(stockValue()).toBe("88");
    wrapper.unmount();
  });

  it("refreshes deposit, status and receivable when a payment is recorded", async () => {
    getCustomerById.mockResolvedValue({
      nameBn: "রহিম",
      address: "ঢাকা",
      outstanding: 100,
    });
    const postInvoice = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 0,
      previousDue: 100,
      currentDue: 120,
      notes: "first purchase",
    }));
    let dataChangedCb:
      | ((p: { kind: string; action: string; id: number }) => void)
      | null = null;
    const onDataChanged = vi.fn(
      (cb: (p: { kind: string; action: string; id: number }) => void) => {
        dataChangedCb = cb;
        return () => undefined;
      }
    );
    const getInvoiceById = vi.fn(async () => ({
      id: "inv-1",
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 15,
      previousDue: 100,
      currentDue: 105,
      notes: "first purchase",
    }));
    const { wrapper, postButton } = await setupPostableEntry(
      postInvoice,
      vi.fn(),
      { onDataChanged, getInvoiceById }
    );
    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    dataChangedCb!({ kind: "invoice", action: "payment", id: 1 });
    await new Promise((r) => setTimeout(r, 0));

    expect(getInvoiceById).toHaveBeenCalledWith("inv-1");
    const values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    // Deposit total, status deposit, difference, next due and receivable
    expect(values.filter((v) => v === "15.00").length).toBeGreaterThanOrEqual(
      2
    );
    expect(values).toContain("5.00"); // difference: 20 - 15
    expect(values.filter((v) => v === "105.00").length).toBe(2); // next due + receivable
    wrapper.unmount();
  });

  it("shows the error and stays editable when posting fails", async () => {
    const postInvoice = vi.fn(async () => {
      throw new Error("Discount cannot exceed subtotal");
    });
    const { wrapper, postButton } = await setupPostableEntry(postInvoice);

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.text()).toContain("Discount cannot exceed subtotal");
    expect((postButton.element as HTMLButtonElement).disabled).toBe(false);
    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
    expect((rowInputs[0]!.element as HTMLInputElement).disabled).toBe(false);
    wrapper.unmount();
  });
});

describe("Dashboard v2 — action button navigation", () => {
  let openTotalSellWindow: ReturnType<typeof vi.fn>;
  let openDailyReportWindow: ReturnType<typeof vi.fn>;
  let openClientSelectWindow: ReturnType<typeof vi.fn>;
  let openPaymentReportWindow: ReturnType<typeof vi.fn>;
  let listCustomers: ReturnType<typeof vi.fn>;
  let listProducts: ReturnType<typeof vi.fn>;
  let openPrintPreview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentLang.value = "en";
    openTotalSellWindow = vi.fn(async () => undefined);
    openDailyReportWindow = vi.fn(async () => undefined);
    openClientSelectWindow = vi.fn(async () => undefined);
    openPaymentReportWindow = vi.fn(async () => undefined);
    listCustomers = vi.fn(async () => [
      {
        id: 7,
        nameBn: "বোখে বেকারী",
        outstanding: 101013,
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    listProducts = vi.fn(async () => [
      {
        id: 10,
        nameBn: "চানা অরেঞ্জ ট্যাক",
        unit: "পেকেট",
        price: 100,
        stock: 6,
        active: true,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    openPrintPreview = vi.fn(async () => "job-1");
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer: vi.fn(async () => []),
      openTotalSellWindow,
      openDailyReportWindow,
      openClientSelectWindow,
      openPaymentReportWindow,
      listCustomers,
      listProducts,
      openPrintPreview,
    };
  });

  function mountDashboard() {
    return mount(Dashboard, {
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    });
  }

  function findButton(
    wrapper: ReturnType<typeof mountDashboard>,
    label: string
  ) {
    const button = wrapper
      .findAll("button")
      .find((b) => b.text() === label);
    expect(button, `button "${label}" not found`).toBeTruthy();
    return button!;
  }

  const wiredButtons: [label: string, page: string][] = [
    ["History", "customer-history"],
    ["Cust. Form", "customers"],
    ["Item Form", "products"],
    ["Item Purchase History", "product-purchase-history"],
    ["Item Sale History", "product-sales-history"],
    ["Purchase Entry", "purchase-entry"],
  ];

  it.each(wiredButtons)(
    "emits navigate(%s → %s) on click",
    async (label, page) => {
      const wrapper = mountDashboard();
      await findButton(wrapper, label).trigger("click");
      expect(wrapper.emitted("navigate")).toEqual([[page]]);
      wrapper.unmount();
    }
  );

  function customerIdInput(wrapper: ReturnType<typeof mountDashboard>) {
    const rows = wrapper
      .findAll("div")
      .filter(
        (d) => d.text().includes("Customer ID") && d.find("input").exists()
      );
    const row = rows[rows.length - 1];
    expect(row).toBeTruthy();
    return row!.find("input");
  }

  it("includes the entered customer ID when navigating to history", async () => {
    const wrapper = mountDashboard();
    await customerIdInput(wrapper).setValue("42");
    await findButton(wrapper, "History").trigger("click");
    expect(wrapper.emitted("navigate")).toEqual([
      ["customer-history", { customerId: 42 }],
    ]);
    wrapper.unmount();
  });

  it("omits the customer ID for history when the input is invalid", async () => {
    const wrapper = mountDashboard();
    await customerIdInput(wrapper).setValue("abc");
    await findButton(wrapper, "History").trigger("click");
    expect(wrapper.emitted("navigate")).toEqual([["customer-history"]]);
    wrapper.unmount();
  });

  it.each([
    ["Refresh"],
    ["Total Sell"],
    ["Single Print"],
    ["Direct Print"],
    ["Select Print"],
  ])("does not emit navigate for non-navigating button %s", async (label) => {
    const wrapper = mountDashboard();
    await findButton(wrapper, label).trigger("click");
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  it("Total Sell opens the date range window", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Total Sell").trigger("click");

    expect(openTotalSellWindow).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("Cust. List prints the customer roll instead of navigating", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Cust. List").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    // Also called to fill the Customer ID dropdown, so just check the roll
    expect(listCustomers).toHaveBeenCalled();
    expect(openPrintPreview).toHaveBeenCalledTimes(1);
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
      columns?: number;
    };
    expect(doc.title).toBe("Customer List");
    expect(doc.bodyHtml).toContain("বোখে বেকারী");
    // Half a page each, left then right
    expect(doc.columns).toBe(2);
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  it("Item List prints the product roll instead of navigating", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Item List").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(listProducts).toHaveBeenCalledTimes(1);
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
      columns?: number;
    };
    expect(doc.title).toBe("Product List");
    expect(doc.bodyHtml).toContain("চানা অরেঞ্জ ট্যাক");
    expect(doc.bodyHtml).toContain('<td class="stock">6</td>');
    // Half a page each, left then right
    expect(doc.columns).toBe(2);
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  it("Client Report opens the client picker instead of navigating", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Client Report").trigger("click");

    expect(openClientSelectWindow).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  it("Daily Payment Report opens the date range window instead of navigating", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Daily Payment Report").trigger("click");

    expect(openPaymentReportWindow).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });

  it("Daily Report opens the date range window instead of navigating", async () => {
    const wrapper = mountDashboard();
    await findButton(wrapper, "Daily Report").trigger("click");

    expect(openDailyReportWindow).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });
});
