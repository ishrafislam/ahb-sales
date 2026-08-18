import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrintMargins from "../../src/views/PrintMargins.vue";
import { currentLang } from "../../src/i18n";
import { MAX_MARGIN_MM } from "../../src/constants/business";

describe("Print margins window", () => {
  const getPrintJob = vi.fn();
  const setPrintMargins = vi.fn();
  const runPrint = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    window.location.hash = "#print-margins/job-1";
    getPrintJob.mockReset().mockResolvedValue({
      doc: { title: "Money Report", bodyHtml: "<h1>Rows</h1>" },
      margins: { top: 20, bottom: 15, left: 10, right: 5 },
    });
    setPrintMargins.mockReset().mockResolvedValue(null);
    runPrint.mockReset().mockResolvedValue({ success: true });
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      getPrintJob,
      setPrintMargins,
      runPrint,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  afterEach(() => {
    // A test that fails mid-way must not leave fake timers behind
    vi.useRealTimers();
  });

  async function mountView() {
    const wrapper = mount(PrintMargins, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const field = (wrapper: View, side: string) =>
    wrapper.find(`#margin-${side}`).element as HTMLInputElement;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;

  it("seeds the four inputs from the job", async () => {
    const wrapper = await mountView();

    expect(getPrintJob).toHaveBeenCalledWith("job-1");
    expect(field(wrapper, "top").value).toBe("20");
    expect(field(wrapper, "bottom").value).toBe("15");
    expect(field(wrapper, "left").value).toBe("10");
    expect(field(wrapper, "right").value).toBe("5");
    wrapper.unmount();
  });

  it("pushes every edit to the preview", async () => {
    const wrapper = await mountView();
    // Fake timers only after mounting, so the load await still resolves
    vi.useFakeTimers();

    await wrapper.find("#margin-top").setValue("40");
    vi.advanceTimersByTime(200);

    expect(setPrintMargins).toHaveBeenCalledWith("job-1", {
      top: 40,
      bottom: 15,
      left: 10,
      right: 5,
    });
    vi.useRealTimers();
    wrapper.unmount();
  });

  it("disables Print while a value is out of range", async () => {
    const wrapper = await mountView();
    const disabled = () =>
      (button(wrapper, "Print").element as HTMLButtonElement).disabled;

    expect(disabled()).toBe(false);

    await wrapper.find("#margin-left").setValue(String(MAX_MARGIN_MM + 1));
    expect(disabled()).toBe(true);

    await wrapper.find("#margin-left").setValue("-1");
    expect(disabled()).toBe(true);

    await wrapper.find("#margin-left").setValue("");
    expect(disabled()).toBe(true);

    await wrapper.find("#margin-left").setValue("0");
    expect(disabled()).toBe(false);
    wrapper.unmount();
  });

  it("prints with the entered margins and closes", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Print").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(runPrint).toHaveBeenCalledWith("job-1", {
      top: 20,
      bottom: 15,
      left: 10,
      right: 5,
    });
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows the reason and stays open when printing fails", async () => {
    runPrint.mockResolvedValueOnce({
      success: false,
      reason: "No printers found",
    });
    const wrapper = await mountView();
    await button(wrapper, "Print").trigger("click");
    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.text()).toContain("No printers found");
    expect(close).not.toHaveBeenCalled();
    // Still usable for another attempt
    expect(
      (button(wrapper, "Print").element as HTMLButtonElement).disabled
    ).toBe(false);
    wrapper.unmount();
  });

  it("Close closes the window", async () => {
    const wrapper = await mountView();
    await button(wrapper, "Close").trigger("click");

    expect(close).toHaveBeenCalled();
    expect(runPrint).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
