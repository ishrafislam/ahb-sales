import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PaymentWindow from "../../src/PaymentWindow.vue";
import { currentLang } from "../../src/i18n";

describe("PaymentWindow", () => {
  const addInvoicePayment = vi.fn();
  const openEditPaymentWindow = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    addInvoicePayment.mockReset().mockResolvedValue({});
    openEditPaymentWindow.mockReset().mockResolvedValue(undefined);
    close.mockReset();
    window.location.hash = "#payment/inv-1";
    (window as unknown as { ahb: unknown }).ahb = {
      getLanguage: vi.fn().mockResolvedValue("en"),
      onLanguageChanged: vi.fn(() => () => undefined),
      addInvoicePayment,
      openEditPaymentWindow,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  function findButton(wrapper: ReturnType<typeof mount>, label: string) {
    return wrapper
      .findAll("button")
      .find((b) => b.text() === label)!;
  }

  it("renders amount/comment fields and the three buttons", () => {
    const wrapper = mount(PaymentWindow);
    expect(wrapper.find("input").exists()).toBe(true);
    expect(wrapper.find("textarea").exists()).toBe(true);
    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels).toEqual(["Okay", "Cancel", "Edit Previous Payment"]);
    wrapper.unmount();
  });

  it("Okay saves the payment to the invoice from the hash and closes", async () => {
    const wrapper = mount(PaymentWindow);
    await wrapper.find("input").setValue("60.5");
    await wrapper.find("textarea").setValue("first payment");
    await findButton(wrapper, "Okay").trigger("click");
    await Promise.resolve();
    expect(addInvoicePayment).toHaveBeenCalledWith("inv-1", {
      amount: 60.5,
      notes: "first payment",
    });
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows an error for an invalid amount without calling IPC", async () => {
    const wrapper = mount(PaymentWindow);
    await wrapper.find("input").setValue("0");
    await findButton(wrapper, "Okay").trigger("click");
    expect(addInvoicePayment).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      "Payment amount must be greater than zero"
    );
    wrapper.unmount();
  });

  it("shows the IPC error and stays open when saving fails", async () => {
    addInvoicePayment.mockRejectedValueOnce(new Error("Invoice not found"));
    const wrapper = mount(PaymentWindow);
    await wrapper.find("input").setValue("10");
    await findButton(wrapper, "Okay").trigger("click");
    await Promise.resolve();
    await Promise.resolve();
    await wrapper.vm.$nextTick();
    expect(close).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Invoice not found");
    wrapper.unmount();
  });

  it("Cancel closes without saving", async () => {
    const wrapper = mount(PaymentWindow);
    await findButton(wrapper, "Cancel").trigger("click");
    expect(addInvoicePayment).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("Edit Previous Payment opens the edit window and closes itself", async () => {
    const wrapper = mount(PaymentWindow);
    await findButton(wrapper, "Edit Previous Payment").trigger("click");
    await Promise.resolve();
    expect(openEditPaymentWindow).toHaveBeenCalledWith("inv-1");
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
