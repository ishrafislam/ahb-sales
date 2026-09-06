import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EditPaymentWindow from "../../src/EditPaymentWindow.vue";
import { currentLang } from "../../src/i18n";

describe("EditPaymentWindow", () => {
  const getInvoiceById = vi.fn();
  const updateInvoicePayment = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    getInvoiceById.mockReset().mockResolvedValue({
      id: "inv-1",
      customerId: 200,
      payments: [
        {
          id: "p-1",
          date: "2026-07-23T10:00:00.000Z",
          amount: 800,
          notes: "old comment",
          createdAt: "2026-07-23T10:00:00.000Z",
        },
      ],
    });
    updateInvoicePayment.mockReset().mockResolvedValue({});
    close.mockReset();
    window.location.hash = "#edit-payment/inv-1";
    (window as unknown as { ahb: unknown }).ahb = {
      getLanguage: vi.fn().mockResolvedValue("en"),
      onLanguageChanged: vi.fn(() => () => undefined),
      getInvoiceById,
      updateInvoicePayment,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  async function mountWindow() {
    const wrapper = mount(EditPaymentWindow);
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  function findButton(
    wrapper: Awaited<ReturnType<typeof mountWindow>>,
    label: string
  ) {
    return wrapper.findAll("button").find((b) => b.text() === label)!;
  }

  it("pre-fills date/customer (read-only) and amount/comment (editable)", async () => {
    const wrapper = await mountWindow();
    expect(getInvoiceById).toHaveBeenCalledWith("inv-1");
    const inputs = wrapper.findAll("input");
    const [date, customer, amount] = inputs.map(
      (i) => i.element as HTMLInputElement
    );
    expect(date!.readOnly).toBe(true);
    expect(date!.value).toBe("23/07/2026");
    expect(customer!.readOnly).toBe(true);
    expect(customer!.value).toBe("200");
    expect(amount!.readOnly).toBe(false);
    expect(amount!.value).toBe("800.00");
    const textarea = wrapper.find("textarea").element as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(false);
    expect(textarea.value).toBe("old comment");
    wrapper.unmount();
  });

  it("Okay saves the edited payment and closes", async () => {
    const wrapper = await mountWindow();
    await wrapper.findAll("input")[2]!.setValue("500");
    await wrapper.find("textarea").setValue("corrected");
    await findButton(wrapper, "Okay").trigger("click");
    await Promise.resolve();
    expect(updateInvoicePayment).toHaveBeenCalledWith("inv-1", {
      amount: 500,
      notes: "corrected",
    });
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("Okay with 0 removes the payment", async () => {
    const wrapper = await mountWindow();
    await wrapper.findAll("input")[2]!.setValue("0");
    await findButton(wrapper, "Okay").trigger("click");
    await Promise.resolve();
    expect(updateInvoicePayment).toHaveBeenCalledWith("inv-1", {
      amount: 0,
      notes: "old comment",
    });
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows an error for a negative amount without calling IPC", async () => {
    const wrapper = await mountWindow();
    await wrapper.findAll("input")[2]!.setValue("-5");
    await findButton(wrapper, "Okay").trigger("click");
    expect(updateInvoicePayment).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Payment amount cannot be negative");
    wrapper.unmount();
  });

  it("shows a message and disables saving when there is no payment", async () => {
    getInvoiceById.mockResolvedValue({
      id: "inv-1",
      customerId: 200,
      payments: [],
    });
    const wrapper = await mountWindow();
    expect(wrapper.text()).toContain("No payment to edit yet");
    const okay = findButton(wrapper, "Okay");
    expect((okay.element as HTMLButtonElement).disabled).toBe(true);
    await okay.trigger("click");
    expect(updateInvoicePayment).not.toHaveBeenCalled();
    // Amount and comment stay locked
    expect(
      (wrapper.findAll("input")[2]!.element as HTMLInputElement).readOnly
    ).toBe(true);
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).readOnly
    ).toBe(true);
    wrapper.unmount();
  });

  it("Cancel closes without saving", async () => {
    const wrapper = await mountWindow();
    await findButton(wrapper, "Cancel").trigger("click");
    expect(updateInvoicePayment).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
