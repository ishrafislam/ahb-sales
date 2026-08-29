import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import PrintPreview from "../../src/views/PrintPreview.vue";
import { currentLang } from "../../src/i18n";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../../src/constants/business";
import type { PrintMargins } from "../../src/print/document";

describe("Print preview window", () => {
  const getPrintJob = vi.fn();
  const openPrintMargins = vi.fn();
  let marginsCb: ((p: { id: string; margins: PrintMargins }) => void) | null =
    null;

  const doc = {
    title: "Money Report",
    bodyHtml: "<h1>Rows</h1>",
    styleCss: "h1 { color: red }",
  };

  beforeEach(() => {
    currentLang.value = "en";
    window.location.hash = "#print-preview/job-1";
    marginsCb = null;
    getPrintJob.mockReset().mockResolvedValue({
      doc,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });
    openPrintMargins.mockReset().mockResolvedValue(undefined);
    (window as unknown as { ahb: unknown }).ahb = {
      getPrintJob,
      openPrintMargins,
      onPrintMarginsChanged: vi.fn(
        (cb: (p: { id: string; margins: PrintMargins }) => void) => {
          marginsCb = cb;
          return () => {
            marginsCb = null;
          };
        }
      ),
    };
  });

  async function mountView() {
    const wrapper = mount(PrintPreview, { attachTo: document.body });
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  type View = Awaited<ReturnType<typeof mountView>>;

  const slider = (wrapper: View) =>
    wrapper.find("#zoom-slider").element as HTMLInputElement;
  const percent = (wrapper: View) =>
    wrapper.find('[data-role="zoom-percent"]').text();
  const sheetFrames = (wrapper: View) =>
    wrapper.findAll('[data-role="sheet"] iframe');
  const srcdoc = (wrapper: View) =>
    sheetFrames(wrapper)[0]?.attributes("srcdoc") ?? "";

  it("loads the job and renders a sheet with the composed document", async () => {
    const wrapper = await mountView();

    expect(getPrintJob).toHaveBeenCalledWith("job-1");
    expect(wrapper.findAll('[data-role="sheet"]')).toHaveLength(1);
    expect(srcdoc(wrapper)).toContain("<h1>Rows</h1>");
    expect(srcdoc(wrapper)).toContain("padding: 0.5in 0.5in 0.5in 0.5in;");
    expect(wrapper.text()).toContain("Money Report");
    wrapper.unmount();
  });

  it("slices every document on the horizontal axis", async () => {
    const wrapper = await mountView();
    const style = sheetFrames(wrapper)[0]!.attributes("style") ?? "";

    expect(style).toContain("margin-left");
    expect(style).not.toContain("margin-top");
    // Even a one-column document flows into page-tall columns
    expect(srcdoc(wrapper)).toContain("column-count");
    expect(srcdoc(wrapper)).toContain("column-fill: auto");
    wrapper.unmount();
  });

  // jsdom lays nothing out, so the extent has to be stood in for. The point
  // under test is that the measurement happens on load at all: an srcdoc
  // iframe is still empty on the tick after mount, where it reports the
  // frame's own height and reads as exactly one page.
  function stubExtent(wrapper: View, axis: "scrollWidth", px: number) {
    const frame = wrapper.find('[data-role="measure"]')
      .element as HTMLIFrameElement;
    const root = frame.contentDocument!.documentElement;
    Object.defineProperty(root, axis, { value: px, configurable: true });
    return frame;
  }

  it("measures off a frame one page wide, so the count can come down", async () => {
    const wrapper = await mountView();
    const frame = wrapper.find('[data-role="measure"]');

    expect(frame.attributes("style")).toContain("width: 210mm");
    // Composed for a single page, whatever the sheets show
    expect(frame.attributes("srcdoc")).toContain("column-count: 1");
    wrapper.unmount();
  });

  it("paginates a long document once the sheet has loaded", async () => {
    const wrapper = await mountView();
    expect(wrapper.findAll('[data-role="sheet"]')).toHaveLength(1);

    const frame = stubExtent(wrapper, "scrollWidth", 2000);
    frame.dispatchEvent(new Event("load"));
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // 2000px over an A4 width of ~793.7px
    expect(wrapper.findAll('[data-role="sheet"]')).toHaveLength(3);
    const styles = sheetFrames(wrapper).map((f) => f.attributes("style") ?? "");
    expect(styles[0]).toContain("margin-left: 0mm");
    expect(styles[1]).toContain("margin-left: -210mm");
    expect(styles[2]).toContain("margin-left: -420mm");
    wrapper.unmount();
  });

  it("starts at 100% and steps with the + and − buttons", async () => {
    const wrapper = await mountView();
    expect(percent(wrapper)).toBe("100%");

    await wrapper.find('[aria-label="zoom-in"]').trigger("click");
    expect(percent(wrapper)).toBe("110%");

    await wrapper.find('[aria-label="zoom-out"]').trigger("click");
    await wrapper.find('[aria-label="zoom-out"]').trigger("click");
    expect(percent(wrapper)).toBe("90%");
    wrapper.unmount();
  });

  it("clamps zoom at both ends", async () => {
    const wrapper = await mountView();
    const zoomOut = wrapper.find('[aria-label="zoom-out"]');

    for (let i = 0; i < 40; i++) await zoomOut.trigger("click");
    expect(Number(slider(wrapper).value)).toBe(ZOOM_MIN);
    expect(
      (zoomOut.element as HTMLButtonElement).disabled
    ).toBe(true);

    const zoomIn = wrapper.find('[aria-label="zoom-in"]');
    for (let i = 0; i < 80; i++) await zoomIn.trigger("click");
    expect(Number(slider(wrapper).value)).toBe(ZOOM_MAX);
    expect((zoomIn.element as HTMLButtonElement).disabled).toBe(true);
    wrapper.unmount();
  });

  it("drives zoom from the slider", async () => {
    const wrapper = await mountView();

    await wrapper.find("#zoom-slider").setValue("2");
    expect(percent(wrapper)).toBe("200%");
    wrapper.unmount();
  });

  it("zooms on Ctrl+wheel only", async () => {
    const wrapper = await mountView();
    const canvas = wrapper.find("div.overflow-auto").element;
    // test-utils cannot set ctrlKey on a synthesised event, so dispatch the
    // real thing
    const wheel = (deltaY: number, ctrlKey: boolean) =>
      canvas.dispatchEvent(
        new WheelEvent("wheel", { deltaY, ctrlKey, bubbles: true })
      );

    // A plain wheel is left alone so the canvas scrolls
    wheel(-100, false);
    await wrapper.vm.$nextTick();
    expect(percent(wrapper)).toBe("100%");

    wheel(-100, true);
    await wrapper.vm.$nextTick();
    expect(percent(wrapper)).toBe(`${Math.round((1 + ZOOM_STEP) * 100)}%`);

    wheel(100, true);
    await wrapper.vm.$nextTick();
    expect(percent(wrapper)).toBe("100%");
    wrapper.unmount();
  });

  it("opens the margins window on Ctrl+P", async () => {
    const wrapper = await mountView();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "p", ctrlKey: true })
    );
    await wrapper.vm.$nextTick();

    expect(openPrintMargins).toHaveBeenCalledWith("job-1");
    wrapper.unmount();
  });

  it("opens the margins window from the Print button, the shortcut's only visible sign", async () => {
    const wrapper = await mountView();
    const button = wrapper.find('[data-role="print"]');

    expect(button.text()).toBe("Print");
    await button.trigger("click");

    expect(openPrintMargins).toHaveBeenCalledWith("job-1");
    wrapper.unmount();
  });

  it("labels the Print button in the current language", async () => {
    currentLang.value = "bn";
    const wrapper = await mountView();

    expect(wrapper.find('[data-role="print"]').text()).toBe("প্রিন্ট");
    wrapper.unmount();
  });

  it("re-composes when the margins change for this job", async () => {
    const wrapper = await mountView();

    marginsCb!({
      id: "other-job",
      margins: { top: 2, bottom: 0.2, left: 0.2, right: 0.2 },
    });
    await wrapper.vm.$nextTick();
    expect(srcdoc(wrapper)).toContain("padding: 0.5in 0.5in 0.5in 0.5in;");

    marginsCb!({
      id: "job-1",
      margins: { top: 2, bottom: 0.2, left: 0.6, right: 1 },
    });
    await wrapper.vm.$nextTick();
    expect(srcdoc(wrapper)).toContain("padding: 2in 1in 0.2in 0.6in;");
    wrapper.unmount();
  });
});
