import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import CustomersView from "../src/views/CustomersView.vue";

type DataChanged = (payload: {
  kind: string;
  action: string;
  id: number;
}) => void;

describe("CustomersView.vue", () => {
  let customersData: Array<Record<string, unknown>>;
  let dataChangedCb: DataChanged | null;

  beforeEach(() => {
    customersData = [];
    dataChangedCb = null;

    const listCustomers = vi.fn(async () => customersData);
    const addCustomer = vi.fn(async (c: Record<string, unknown>) => {
      const active = typeof c.active === "boolean" ? c.active : true;
      const outstanding =
        typeof c.outstanding === "number"
          ? c.outstanding
          : Number(c.outstanding ?? 0);
      const cust: Record<string, unknown> = { ...c, active, outstanding };
      customersData.push(cust);
      return cust;
    });
    const onDataChanged = (cb: DataChanged) => {
      dataChangedCb = cb;
      return () => {
        dataChangedCb = null;
      };
    };

    // @ts-expect-error - define test stub on global
    window.ahb = {
      listCustomers,
      addCustomer,
      onDataChanged,
    };
  });

  it("shows empty state when no customers", async () => {
    const wrapper = mount(CustomersView);
    await Promise.resolve();
    await nextTick();
    expect(wrapper.text()).toContain("No customers");
  });

  it("renders rows when customers exist", async () => {
    customersData = [
      {
        id: 10,
        nameBn: "রহিম",
        address: "Dhaka",
        outstanding: 0,
        active: true,
      },
      {
        id: 11,
        nameBn: "করিম",
        address: "Chittagong",
        outstanding: 50,
        active: true,
      },
    ];
    const wrapper = mount(CustomersView);
    await Promise.resolve();
    await nextTick();
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(wrapper.text()).toContain("রহিম");
    expect(wrapper.text()).toContain("করিম");
  });

  it("adds a customer via the form and refreshes list", async () => {
    const wrapper = mount(CustomersView);
    await nextTick();
    // Fill form (order: id, nameBn, address, outstanding)
    const inputs = wrapper.findAll("form input");
    expect(inputs.length).toBe(4);
    await inputs[0].setValue("12");
    await inputs[1].setValue("সালাম");
    await inputs[2].setValue("Sylhet");
    await inputs[3].setValue("75");
    await wrapper.find("form").trigger("submit.prevent");
    await Promise.resolve();
    await nextTick();

    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(wrapper.text()).toContain("সালাম");
  });

  it("refreshes on data:changed events for customers", async () => {
    customersData = [
      {
        id: 1,
        nameBn: "শামীম",
        address: "Khulna",
        outstanding: 10,
        active: true,
      },
    ];
    const wrapper = mount(CustomersView);
    await nextTick();
    customersData = [
      ...customersData,
      {
        id: 2,
        nameBn: "সাব্বির",
        address: "Rajshahi",
        outstanding: 20,
        active: true,
      },
    ];
    dataChangedCb?.({ kind: "customer", action: "add", id: 2 });
    await Promise.resolve();
    await nextTick();
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(wrapper.text()).toContain("সাব্বির");
  });
});
