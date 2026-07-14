import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CustomerStatusPanel, {
  type PostedStatus,
} from "../../../src/components/dashboard/CustomerStatusPanel.vue";
import { currentLang } from "../../../src/i18n";

describe("CustomerStatusPanel", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  function mountPanel(status: PostedStatus | null, locked = false) {
    return mount(CustomerStatusPanel, {
      props: {
        status,
        locked,
        comment: "",
        "onUpdate:comment": () => undefined,
      },
    });
  }

  it("renders empty disabled fields without a status", () => {
    const wrapper = mountPanel(null);
    const inputs = wrapper.findAll("input");
    expect(inputs.length).toBe(7);
    for (const input of inputs) {
      const el = input.element as HTMLInputElement;
      expect(el.disabled).toBe(true);
      expect(el.value).toBe("");
    }
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).disabled
    ).toBe(false);
    wrapper.unmount();
  });

  it("renders the posted values", () => {
    const wrapper = mountPanel({
      totalPrice: 21,
      discount: 1,
      bill: 20,
      deposit: 5,
      difference: 15,
      previousDue: 100,
      nextDue: 115,
    });
    const values = wrapper
      .findAll("input")
      .map((i) => (i.element as HTMLInputElement).value);
    expect(values).toEqual([
      "21.00",
      "1.00",
      "20.00",
      "5.00",
      "15.00",
      "100.00",
      "115.00",
    ]);
    wrapper.unmount();
  });

  it("locks the comment when locked", () => {
    const wrapper = mountPanel(null, true);
    expect(
      (wrapper.find("textarea").element as HTMLTextAreaElement).disabled
    ).toBe(true);
    wrapper.unmount();
  });
});
