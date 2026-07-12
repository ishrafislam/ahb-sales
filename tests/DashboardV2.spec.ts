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

  it("renders last bill date and last bill as always-disabled inputs", () => {
    const wrapper = mountDashboard();
    const disabled = getDisabledInputs(wrapper);
    expect(disabled.length).toBe(2);
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
    expect(values).toEqual(["—", "—"]);
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
    expect(values).toEqual(["—", "—"]);
    wrapper.unmount();
  });
});
