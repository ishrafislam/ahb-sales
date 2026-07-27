import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Customers from "../../src/views/Customers.vue";
import { currentLang } from "../../src/i18n";

type CustomerStub = {
  id: number;
  nameBn: string;
  address?: string;
  phone?: string;
  outstanding: number;
  active: boolean;
};

describe("Customers window", () => {
  const listCustomers = vi.fn();
  const addCustomer = vi.fn();
  const updateCustomer = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    listCustomers.mockReset().mockResolvedValue([
      {
        id: 1,
        nameBn: "Customer 1",
        address: "Dhaka",
        phone: "0170000",
        outstanding: 12500,
        active: true,
      },
      {
        id: 3,
        nameBn: "Customer 3",
        outstanding: -250,
        active: true,
      },
      { id: 4, nameBn: "Customer 4", outstanding: 0, active: true },
    ] as CustomerStub[]);
    addCustomer.mockReset().mockResolvedValue({});
    updateCustomer.mockReset().mockResolvedValue({});
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      listCustomers,
      addCustomer,
      updateCustomer,
      onDataChanged: vi.fn(() => () => undefined),
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  async function mountView() {
    const wrapper = mount(Customers, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const field = (wrapper: View, id: string) =>
    wrapper.find(`#${id}`).element as HTMLInputElement;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label);

  const selectRow = async (wrapper: View, id: number) => {
    await wrapper.find(`li[data-id="${id}"]`).trigger("click");
  };

  it("lists every slot and shows the selected customer read-only", async () => {
    const wrapper = await mountView();
    // All customer slots are rendered, named where a customer exists
    const rows = wrapper.findAll("li[data-id]");
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0]!.text()).toContain("Customer 1");
    expect(rows[1]!.text().trim()).toBe("2");

    expect(field(wrapper, "customer-id").value).toBe("1");
    expect(field(wrapper, "customer-name").value).toBe("Customer 1");
    expect(field(wrapper, "customer-address").value).toBe("Dhaka");
    expect(field(wrapper, "customer-phone").value).toBe("0170000");

    // Locked until Edit, and no Save button is offered
    expect(field(wrapper, "customer-name").disabled).toBe(true);
    expect(field(wrapper, "customer-address").disabled).toBe(true);
    expect(button(wrapper, "Save")).toBeUndefined();
    expect(button(wrapper, "Edit")).toBeTruthy();
    wrapper.unmount();
  });

  it("has no first/previous/next/last or add/update buttons", async () => {
    const wrapper = await mountView();
    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels).toEqual(["Edit", "Close"]);
    wrapper.unmount();
  });

  it("colors the read-only outstanding by due / credit / zero", async () => {
    const wrapper = await mountView();
    const outstanding = () => wrapper.find("#customer-outstanding");

    // Customer 1 owes 12500 → red, prefixed with the localized taka text
    expect((outstanding().element as HTMLInputElement).disabled).toBe(true);
    expect((outstanding().element as HTMLInputElement).value).toBe(
      "Tk 12500.00"
    );
    expect(outstanding().classes()).toContain("text-red-600");

    // Customer 3 paid extra → green, shown unsigned
    await selectRow(wrapper, 3);
    expect((outstanding().element as HTMLInputElement).value).toBe("Tk 250.00");
    expect(outstanding().classes()).toContain("text-green-600");

    // Customer 4 settled → neutral
    await selectRow(wrapper, 4);
    expect((outstanding().element as HTMLInputElement).value).toBe("Tk 0.00");
    expect(outstanding().classes()).not.toContain("text-red-600");
    expect(outstanding().classes()).not.toContain("text-green-600");
    wrapper.unmount();
  });

  it("Edit reveals Save and updates an existing customer", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(field(wrapper, "customer-name").disabled).toBe(false);
    expect(button(wrapper, "Edit")).toBeUndefined();
    const save = button(wrapper, "Save")!;
    expect(save).toBeTruthy();

    await wrapper.find("#customer-name").setValue("Renamed");
    await wrapper.find("#customer-address").setValue("Khulna");
    await save.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(updateCustomer).toHaveBeenCalledWith(1, {
      nameBn: "Renamed",
      address: "Khulna",
      phone: "0170000",
      active: true,
    });
    expect(addCustomer).not.toHaveBeenCalled();
    // Re-locks after saving
    expect(field(wrapper, "customer-name").disabled).toBe(true);
    expect(button(wrapper, "Edit")).toBeTruthy();
    wrapper.unmount();
  });

  it("Edit on an empty slot adds a customer at that ID", async () => {
    const wrapper = await mountView();
    await selectRow(wrapper, 2);
    expect(field(wrapper, "customer-name").value).toBe("");

    await button(wrapper, "Edit")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    // Save stays disabled until a name is entered
    expect((button(wrapper, "Save")!.element as HTMLButtonElement).disabled).toBe(
      true
    );
    await wrapper.find("#customer-name").setValue("New Customer");
    await wrapper.find("#customer-phone").setValue("0180000");
    await button(wrapper, "Save")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(addCustomer).toHaveBeenCalledWith({
      id: 2,
      nameBn: "New Customer",
      address: "",
      phone: "0180000",
      active: true,
    });
    expect(updateCustomer).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("traverses the list with the up and down arrow keys", async () => {
    const wrapper = await mountView();
    const list = wrapper.find("div[tabindex='0']");

    // Focused on open, so arrows work without clicking the list first
    expect(document.activeElement).toBe(list.element);

    // Up at the first slot stays put
    await list.trigger("keydown.up");
    expect(field(wrapper, "customer-id").value).toBe("1");

    await list.trigger("keydown.down");
    expect(field(wrapper, "customer-id").value).toBe("2");
    expect(field(wrapper, "customer-name").value).toBe("");

    await list.trigger("keydown.down");
    expect(field(wrapper, "customer-id").value).toBe("3");
    expect(field(wrapper, "customer-name").value).toBe("Customer 3");
    expect(wrapper.find("li[data-id='3']").classes()).toContain(
      "bg-blue-100"
    );

    await list.trigger("keydown.up");
    expect(field(wrapper, "customer-id").value).toBe("2");
    wrapper.unmount();
  });

  it("arrow traversal discards an in-progress edit", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await wrapper.find("#customer-name").setValue("Discarded");
    await wrapper.find("div[tabindex='0']").trigger("keydown.down");

    expect(button(wrapper, "Save")).toBeUndefined();
    expect(field(wrapper, "customer-name").value).toBe("");
    wrapper.unmount();
  });

  it("switching rows discards an in-progress edit", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await wrapper.find("#customer-name").setValue("Discarded");
    await selectRow(wrapper, 3);

    expect(button(wrapper, "Save")).toBeUndefined();
    expect(field(wrapper, "customer-name").value).toBe("Customer 3");
    wrapper.unmount();
  });

  it("shows a save error and stays editable", async () => {
    updateCustomer.mockRejectedValueOnce(new Error("Customer not found"));
    const wrapper = await mountView();
    await button(wrapper, "Edit")!.trigger("click");
    await wrapper.find("#customer-name").setValue("Renamed");
    await button(wrapper, "Save")!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.text()).toContain("Customer not found");
    expect(field(wrapper, "customer-name").disabled).toBe(false);
    wrapper.unmount();
  });

  it("Close closes the window", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Close")!.trigger("click");
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });
});
