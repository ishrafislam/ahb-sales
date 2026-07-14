import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import Dashboard from "../src/views/Dashboard.vue";
import { currentLang } from "../src/i18n";

type InvoiceStub = {
  date: string;
  totals: { subtotal: number; net: number };
};

describe("Dashboard v2 — customer ID quick entry", () => {
  let listInvoicesByCustomer: ReturnType<
    typeof vi.fn<(customerId: number) => Promise<InvoiceStub[]>>
  >;

  beforeEach(() => {
    currentLang.value = "en";
    listInvoicesByCustomer = vi.fn(async () => [] as InvoiceStub[]);
    (window as unknown as { ahb: unknown }).ahb = { listInvoicesByCustomer };
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

  it("renders product info, last bill, totals and status fields as always-disabled inputs", () => {
    const wrapper = mountDashboard();
    const disabled = getDisabledInputs(wrapper);
    // 2 header + 2 last-bill + grand total + bill + 7 status panel fields
    expect(disabled.length).toBe(13);
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
    // also disabled until a product loads; trailing empties are the
    // grand total, bill and the 7 status panel fields
    expect(values).toEqual(["", "", "—", "—", ...Array(10).fill("")]);
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
    expect(values).toEqual(["", "", "—", "—", ...Array(9).fill("")]);
    wrapper.unmount();
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

  async function setupPostableEntry(postInvoice: ReturnType<typeof vi.fn>) {
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
      postInvoice,
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
    await totalsInput("Deposit").setValue("5");
    await totalsInput("Deposit").trigger("keydown.enter");
    await wrapper.find("textarea").setValue("first purchase");

    const postButton = wrapper
      .findAll("button")
      .find((b) => b.text() === "Post Data")!;
    return { wrapper, postButton };
  }

  it("posts the invoice and shows the status, then locks the form", async () => {
    const postInvoice = vi.fn(async () => ({
      totals: { subtotal: 21, net: 20 },
      discount: 1,
      paid: 5,
      previousDue: 100,
      currentDue: 115,
      notes: "first purchase",
    }));
    const { wrapper, postButton } = await setupPostableEntry(postInvoice);

    await postButton.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(postInvoice).toHaveBeenCalledWith({
      customerId: 12,
      lines: [{ productId: 5, quantity: 2, rate: 10.5 }],
      discount: 1,
      paid: 5,
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
  beforeEach(() => {
    currentLang.value = "en";
    (window as unknown as { ahb: unknown }).ahb = {
      listInvoicesByCustomer: vi.fn(async () => []),
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
    ["Cust. List", "customers"],
    ["Item Form", "products"],
    ["Item List", "products"],
    ["Item Purchase History", "product-purchase-history"],
    ["Item Sale History", "product-sales-history"],
    ["Purchase Entry", "purchase-entry"],
    ["Daily Report", "report-money-daywise"],
    ["Client Report", "report-money-customer"],
    ["Daily Payment Report", "report-daily-payment"],
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
  ])("does not emit navigate for inert button %s", async (label) => {
    const wrapper = mountDashboard();
    await findButton(wrapper, label).trigger("click");
    expect(wrapper.emitted("navigate")).toBeUndefined();
    wrapper.unmount();
  });
});
