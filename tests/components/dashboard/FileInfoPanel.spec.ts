import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FileInfoPanel from "../../../src/components/dashboard/FileInfoPanel.vue";

describe("FileInfoPanel.vue", () => {
  it("renders filename and saved state", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: false,
      },
    });

    expect(wrapper.text()).toContain("sales.ahbs");
    expect(wrapper.text()).toContain("Saved");
    expect(wrapper.text()).not.toContain("Unsaved");
  });

  it("renders unsaved state when dirty", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: true,
      },
    });

    expect(wrapper.text()).toContain("sales.ahbs");
    expect(wrapper.text()).toContain("Unsaved");
    expect(wrapper.text()).not.toContain("Saved");
  });

  it("displays long filenames with truncation", () => {
    const longFileName = "very_long_filename_with_many_characters.ahbs";
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: longFileName,
        fileDirty: false,
      },
    });

    expect(wrapper.text()).toContain(longFileName);
  });

  it("has correct aria-label for saved state", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: false,
      },
    });

    const statusElement = wrapper.find('[role="img"]');
    expect(statusElement.attributes("aria-label")).toBe("Saved");
  });

  it("has correct aria-label for unsaved state", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: true,
      },
    });

    const statusElement = wrapper.find('[role="img"]');
    expect(statusElement.attributes("aria-label")).toBe("Unsaved changes");
  });

  it("applies correct color class for saved state", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: false,
      },
    });

    const statusElement = wrapper.find('[role="img"]');
    expect(statusElement.classes()).toContain("text-green-600");
    expect(statusElement.classes()).not.toContain("text-orange-500");
  });

  it("applies correct color class for unsaved state", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: true,
      },
    });

    const statusElement = wrapper.find('[role="img"]');
    expect(statusElement.classes()).toContain("text-orange-500");
    expect(statusElement.classes()).not.toContain("text-green-600");
  });

  it("has title attribute for tooltip on filename", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: false,
      },
    });

    const filenameSpan = wrapper.find(".truncate");
    expect(filenameSpan.attributes("title")).toBe("sales.ahbs");
  });

  it("renders checkmark icon", () => {
    const wrapper = mount(FileInfoPanel, {
      props: {
        fileNameDisplay: "sales.ahbs",
        fileDirty: false,
      },
    });

    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.classes()).toContain("w-5");
    expect(svg.classes()).toContain("h-5");
  });
});
