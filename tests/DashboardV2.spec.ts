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

  it("renders product info, last bill, totals and status fields as always-disabled inputs", () => {
    const wrapper = mountDashboard();
    const disabled = getDisabledInputs(wrapper);
    // 2 header + 2 last-bill + 3 customer info + grand total + bill
    // + deposit + 7 status panel fields
    expect(disabled.length).toBe(17);
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
    // also disabled until a product loads; other empties are the customer
    // info box, grand total, bill and the 7 status panel fields. The
    // deposit field always shows 0.00.
    expect(values).toEqual([
      "",
      "",
      "—",
      "—",
      ...Array(6).fill(""),
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
      ...Array(5).fill(""),
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
    expect(values).toContain("রহিম");
    expect(values).toContain("ঢাকা");
    expect(values).toContain("250.50");

    // Unknown customer clears the box
    getCustomerById.mockResolvedValue(null);
    await input.setValue("13");
    await input.trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));
    values = getDisabledInputs(wrapper).map(
      (i) => (i.element as HTMLInputElement).value
    );
    expect(values).not.toContain("রহিম");
    expect(values).not.toContain("250.50");
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

    // Edit unlocks the grid and Post Data
    await editButton.trigger("click");
    const rowInputs = wrapper.findAll("tbody tr")[0]!.findAll("input");
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
