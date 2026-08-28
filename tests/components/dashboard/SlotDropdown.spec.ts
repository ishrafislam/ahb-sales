import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import SlotDropdown from "../../../src/components/dashboard/SlotDropdown.vue";
import { currentLang } from "../../../src/i18n";
import type { SlotOption } from "../../../src/components/dashboard/slotOptions";

describe("SlotDropdown", () => {
  const options: SlotOption[] = [
    { id: 2, primary: "চাল", secondary: "Moulvi Bazar" },
    { id: 7, primary: "" },
  ];

  let anchor: HTMLInputElement;

  beforeEach(() => {
    currentLang.value = "en";
    anchor = document.createElement("input");
    document.body.appendChild(anchor);
  });

  afterEach(() => {
    anchor.remove();
    document.querySelectorAll('[data-role="slot-dropdown"]').forEach((n) => {
      n.remove();
    });
  });

  function mountPanel(props: Partial<Record<string, unknown>> = {}) {
    return mount(SlotDropdown, {
      attachTo: document.body,
      props: { open: true, options, highlight: -1, anchor, ...props },
    });
  }

  const panel = () => document.querySelector('[data-role="slot-dropdown"]');
  const rows = () =>
    Array.from(document.querySelectorAll('[data-role="slot-option"]'));

  it("lists every option with its id, name and secondary line", () => {
    const wrapper = mountPanel();

    expect(rows()).toHaveLength(2);
    expect(rows()[0]!.textContent).toContain("2");
    expect(rows()[0]!.textContent).toContain("চাল");
    expect(rows()[0]!.textContent).toContain("Moulvi Bazar");
    wrapper.unmount();
  });

  it("marks a slot with no record as empty, in the current language", () => {
    const wrapper = mountPanel();
    expect(rows()[1]!.textContent).toContain("Empty Slot");
    wrapper.unmount();

    currentLang.value = "bn";
    const bn = mountPanel();
    expect(rows()[1]!.textContent).toContain("খালি স্লট");
    bn.unmount();
  });

  it("renders nothing when closed or empty", () => {
    const closed = mountPanel({ open: false });
    expect(panel()).toBeNull();
    closed.unmount();

    const empty = mountPanel({ options: [] });
    expect(panel()).toBeNull();
    empty.unmount();
  });

  it("emits the clicked option", async () => {
    const wrapper = mountPanel();

    (rows()[1] as HTMLElement).click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("select")?.[0]).toEqual([options[1]]);
    wrapper.unmount();
  });

  it("hangs off the anchor rather than the component's own place in the DOM", () => {
    const wrapper = mountPanel();

    // Teleported to the body, so the entry table's scroll box cannot clip it
    expect(panel()!.parentElement).toBe(document.body);
    expect((panel() as HTMLElement).style.position).toBe("");
    expect(panel()!.className).toContain("fixed");
    wrapper.unmount();
  });
});
