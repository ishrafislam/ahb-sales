import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CustomerInfoBanner from "../../../src/components/dashboard/CustomerInfoBanner.vue";

describe("CustomerInfoBanner.vue", () => {
  const mockLabels = {
    title: "Customer Information",
    id: "ID",
    name: "Name",
    lastBill: "Last Bill",
    due: "Due",
    walkIn: "Walk-in",
    walkInHint: "No customer selected. This invoice must be fully paid.",
  };

  it("renders walk-in view when no customer", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: null,
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("Walk-in");
    expect(wrapper.text()).toContain("No customer selected");
    expect(wrapper.text()).not.toContain("Customer Information");
  });

  it("renders customer information when customer provided", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 101,
          nameBn: "Rahim",
          outstanding: 500.5,
        },
        lastBillText: "2024-11-15",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("Customer Information");
    expect(wrapper.text()).toContain("101");
    expect(wrapper.text()).toContain("Rahim");
    expect(wrapper.text()).toContain("2024-11-15");
    expect(wrapper.text()).toContain("500.50");
  });

  it("formats outstanding amount to 2 decimal places", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
          outstanding: 123.456,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("123.46");
  });

  it("handles zero outstanding", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
          outstanding: 0,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("0.00");
  });

  it("handles missing outstanding", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("0.00");
  });

  it("displays em dash for missing values", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("—");
  });

  it("has correct styling classes", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
          outstanding: 100,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    const container = wrapper.find(".bg-blue-50");
    expect(container.exists()).toBe(true);
    expect(container.classes()).toContain("rounded-lg");
    expect(container.classes()).toContain("p-3");
  });

  it("displays due amount in red color", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
          outstanding: 500,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    const dueSpan = wrapper.find(".text-red-600");
    expect(dueSpan.exists()).toBe(true);
    expect(dueSpan.text()).toContain("500.00");
  });

  it("renders grid layout with correct columns", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 1,
          nameBn: "Test",
          outstanding: 100,
        },
        lastBillText: "—",
        labels: mockLabels,
      },
    });

    const grid = wrapper.find(".grid");
    expect(grid.classes()).toContain("grid-cols-2");
    expect(grid.classes()).toContain("sm:grid-cols-4");
  });

  it("formats all customer data correctly", () => {
    const wrapper = mount(CustomerInfoBanner, {
      props: {
        customer: {
          id: 999,
          nameBn: "করিম", // Bengali text
          outstanding: 9999.99,
        },
        lastBillText: "Never",
        labels: mockLabels,
      },
    });

    expect(wrapper.text()).toContain("999");
    expect(wrapper.text()).toContain("করিম");
    expect(wrapper.text()).toContain("Never");
    expect(wrapper.text()).toContain("9999.99");
  });
});
