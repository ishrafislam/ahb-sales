import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ClientSelect from "../../src/views/ClientSelect.vue";
import { currentLang } from "../../src/i18n";

describe("Client select window", () => {
  const getCustomerById = vi.fn();
  const openClientReportWindow = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    getCustomerById.mockReset().mockResolvedValue(null);
    openClientReportWindow.mockReset().mockResolvedValue(undefined);
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      getCustomerById,
      openClientReportWindow,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  function mountView() {
    return mount(ClientSelect, { attachTo: document.body });
  }

  type View = ReturnType<typeof mountView>;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;
  const selectedButton = (wrapper: View) =>
    button(wrapper, "Selected Client").element as HTMLButtonElement;

  // The lookup is async, so the input change needs a turn of the loop
  async function typeId(wrapper: View, id: string) {
    await wrapper.find("#client-id").setValue(id);
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
  }

  it("focuses the id field and starts with Selected Client disabled", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(wrapper.find("#client-id").element);
    expect(selectedButton(wrapper).disabled).toBe(true);
    wrapper.unmount();
  });

  it("All Clients opens the range window for every client", async () => {
    const wrapper = mountView();

    await button(wrapper, "All Clients").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(openClientReportWindow).toHaveBeenCalledWith(undefined);
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("keeps Selected Client disabled for an id that matches no one", async () => {
    const wrapper = mountView();
    await typeId(wrapper, "999");

    expect(getCustomerById).toHaveBeenCalledWith(999);
    expect(selectedButton(wrapper).disabled).toBe(true);
    expect(wrapper.find('[data-role="lookup"]').text()).toBe(
      "Customer not found"
    );
    wrapper.unmount();
  });

  it("does not look up an id outside the allowed range", async () => {
    const wrapper = mountView();
    await typeId(wrapper, "0");

    expect(getCustomerById).not.toHaveBeenCalled();
    expect(selectedButton(wrapper).disabled).toBe(true);
    wrapper.unmount();
  });

  it("shows the name and opens the range window for a real client", async () => {
    getCustomerById.mockResolvedValue({ id: 225, nameBn: "মুন্না ভাই" });
    const wrapper = mountView();
    await typeId(wrapper, "225");

    expect(wrapper.find('[data-role="lookup"]').text()).toBe("মুন্না ভাই");
    expect(selectedButton(wrapper).disabled).toBe(false);

    await button(wrapper, "Selected Client").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(openClientReportWindow).toHaveBeenCalledWith(225);
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("opens on Enter in the id field", async () => {
    getCustomerById.mockResolvedValue({ id: 225, nameBn: "মুন্না ভাই" });
    const wrapper = mountView();
    await typeId(wrapper, "225");

    await wrapper.find("#client-id").trigger("keydown.enter");
    await new Promise((r) => setTimeout(r, 0));

    expect(openClientReportWindow).toHaveBeenCalledWith(225);
    wrapper.unmount();
  });

  it("ignores a slow lookup that lands after a newer one", async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    getCustomerById
      .mockImplementationOnce(
        () => new Promise((r) => (resolveFirst = r))
      )
      .mockResolvedValueOnce(null);

    const wrapper = mountView();
    await wrapper.find("#client-id").setValue("225");
    await wrapper.find("#client-id").setValue("999");
    await new Promise((r) => setTimeout(r, 0));

    // The stale answer arrives last and must not resurrect the button
    resolveFirst({ id: 225, nameBn: "মুন্না ভাই" });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    expect(selectedButton(wrapper).disabled).toBe(true);
    wrapper.unmount();
  });
});
