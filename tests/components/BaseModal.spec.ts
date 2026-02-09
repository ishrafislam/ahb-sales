import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BaseModal from "../../src/components/BaseModal.vue";

describe("BaseModal.vue", () => {
  it("renders with title", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test Modal",
      },
      slots: {
        default: "<div>Modal content</div>",
      },
    });

    expect(wrapper.text()).toContain("Test Modal");
    expect(wrapper.text()).toContain("Modal content");
  });

  it("emits close event when clicking overlay", async () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const overlay = wrapper.find(".bg-black\\/40");
    await overlay.trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close event when clicking close button", async () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const closeButton = wrapper.find('button[aria-label="Close"]');
    await closeButton.trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("has correct accessibility attributes", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Accessible Modal",
      },
    });

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("aria-modal")).toBe("true");
  });

  it("applies correct max-width class (default)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const content = wrapper.find(".max-w-4xl");
    expect(content.exists()).toBe(true);
  });

  it("applies correct max-width class (lg)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
        maxWidth: "lg",
      },
    });

    const content = wrapper.find(".max-w-lg");
    expect(content.exists()).toBe(true);
  });

  it("applies correct max-width class (xl)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
        maxWidth: "xl",
      },
    });

    const content = wrapper.find(".max-w-xl");
    expect(content.exists()).toBe(true);
  });

  it("applies correct max-width class (2xl)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
        maxWidth: "2xl",
      },
    });

    const content = wrapper.find(".max-w-2xl");
    expect(content.exists()).toBe(true);
  });

  it("applies correct max-width class (3xl)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
        maxWidth: "3xl",
      },
    });

    const content = wrapper.find(".max-w-3xl");
    expect(content.exists()).toBe(true);
  });

  it("applies correct max-width class (5xl)", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
        maxWidth: "5xl",
      },
    });

    const content = wrapper.find(".max-w-5xl");
    expect(content.exists()).toBe(true);
  });

  it("has close button with correct aria-label", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const closeButton = wrapper.find('button[aria-label="Close"]');
    expect(closeButton.exists()).toBe(true);
    expect(closeButton.text()).toBe("✕");
  });

  it("has scrollable content area", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
      slots: {
        default: "<p>Long content</p>".repeat(50),
      },
    });

    const contentArea = wrapper.find(".overflow-auto");
    expect(contentArea.exists()).toBe(true);
    expect(contentArea.classes()).toContain("max-h-[85vh]");
  });

  it("has fixed positioning overlay", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const overlay = wrapper.find(".fixed");
    expect(overlay.exists()).toBe(true);
    expect(overlay.classes()).toContain("inset-0");
    expect(overlay.classes()).toContain("z-50");
  });

  it("has dark mode classes", () => {
    const wrapper = mount(BaseModal, {
      props: {
        title: "Test",
      },
    });

    const modalContent = wrapper.find('[tabindex="-1"]');
    expect(modalContent.classes()).toContain("dark:bg-gray-900");
    expect(modalContent.classes()).toContain("dark:text-gray-100");
    expect(modalContent.classes()).toContain("dark:border-gray-700");
  });
});
