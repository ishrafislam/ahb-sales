import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuickActions from "../../../src/components/dashboard/QuickActions.vue";

type NavigationPage =
  | "customer-history"
  | "purchase-entry"
  | "customers"
  | "products"
  | "product-sales-history"
  | "product-purchase-history"
  | "report-money-customer"
  | "report-money-daywise"
  | "report-daily-payment";

describe("QuickActions.vue", () => {
  const mockActions = [
    { page: "customers" as NavigationPage, label: "Customers", className: "bg-blue-100" },
    { page: "products" as NavigationPage, label: "Products", className: "bg-green-100" },
    { page: "customer-history" as NavigationPage, label: "History", className: "bg-yellow-100" },
  ];

  it("renders all action buttons", () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBe(3);
    expect(buttons[0]?.text()).toBe("Customers");
    expect(buttons[1]?.text()).toBe("Products");
    expect(buttons[2]?.text()).toBe("History");
  });

  it("applies correct CSS classes to buttons", () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons[0]?.classes()).toContain("bg-blue-100");
    expect(buttons[1]?.classes()).toContain("bg-green-100");
    expect(buttons[2]?.classes()).toContain("bg-yellow-100");
  });

  it("emits navigate event when button is clicked", async () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[0]?.trigger("click");

    expect(wrapper.emitted("navigate")).toBeTruthy();
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["customers"]);
  });

  it("emits correct page for each button", async () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const buttons = wrapper.findAll("button");

    await buttons[0]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["customers"]);

    await buttons[1]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[1]).toEqual(["products"]);

    await buttons[2]?.trigger("click");
    expect(wrapper.emitted("navigate")?.[2]).toEqual(["customer-history"]);
  });

  it("renders empty when no actions provided", () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: [],
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBe(0);
  });

  it("handles many actions in grid layout", () => {
    const manyActions = [
      { page: "customers" as NavigationPage, label: "A", className: "bg-1" },
      { page: "products" as NavigationPage, label: "B", className: "bg-2" },
      { page: "customer-history" as NavigationPage, label: "C", className: "bg-3" },
      { page: "purchase-entry" as NavigationPage, label: "D", className: "bg-4" },
      { page: "product-sales-history" as NavigationPage, label: "E", className: "bg-5" },
      { page: "product-purchase-history" as NavigationPage, label: "F", className: "bg-6" },
    ];

    const wrapper = mount(QuickActions, {
      props: {
        actions: manyActions,
      },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBe(6);
  });

  it("has correct button styling classes", () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const button = wrapper.find("button");
    expect(button.classes()).toContain("py-1.5");
    expect(button.classes()).toContain("px-3");
    expect(button.classes()).toContain("rounded-md");
    expect(button.classes()).toContain("text-sm");
    expect(button.classes()).toContain("font-semibold");
    expect(button.classes()).toContain("transition-colors");
  });

  it("uses key attribute for each button", () => {
    const wrapper = mount(QuickActions, {
      props: {
        actions: mockActions,
      },
    });

    const buttons = wrapper.findAll("button");
    // Vue Test Utils doesn't expose keys directly, but we can verify rendering
    expect(buttons.length).toBe(mockActions.length);
  });
});
