import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import {
  useKeyboardShortcuts,
  formatShortcut,
  type ShortcutConfig,
} from "../../src/composables/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let handler1: ReturnType<typeof vi.fn>;
  let handler2: ReturnType<typeof vi.fn>;
  let shortcuts: ShortcutConfig[];

  beforeEach(() => {
    handler1 = vi.fn();
    handler2 = vi.fn();
    shortcuts = [
      { key: "n", ctrl: true, handler: handler1, description: "New file" },
      { key: "s", ctrl: true, handler: handler2, description: "Save file" },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should detect platform correctly", () => {
    const TestComponent = defineComponent({
      setup() {
        const { isMac } = useKeyboardShortcuts([]);
        return { isMac };
      },
      template: "<div>{{ isMac }}</div>",
    });

    const wrapper = mount(TestComponent);
    // Check that isMac is a boolean
    expect(typeof wrapper.vm.isMac).toBe("boolean");
  });

  it("should register and unregister event listener", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);

    // Should register on mount
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true
    );

    // Should unregister on unmount
    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function),
      true
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("should trigger handler on matching shortcut", async () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);

    // Simulate Ctrl+N
    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should not trigger when key doesn't match", async () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);

    // Simulate Ctrl+P (not registered)
    const event = new KeyboardEvent("keydown", {
      key: "p",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should not trigger in input fields", async () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: '<input id="test-input" />',
    });

    const wrapper = mount(TestComponent);
    const input = wrapper.find("input").element;

    // Simulate Ctrl+N with input focused
    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
    });
    input.dispatchEvent(event);

    expect(handler1).not.toHaveBeenCalled();
  });

  it("should be case insensitive for key matching", async () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);

    // Simulate Ctrl+N (uppercase)
    const event = new KeyboardEvent("keydown", {
      key: "N",
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(handler1).toHaveBeenCalledTimes(1);
  });

  it("should prevent default and stop propagation on match", async () => {
    const TestComponent = defineComponent({
      setup() {
        useKeyboardShortcuts(shortcuts);
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);

    const event = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});

describe("formatShortcut", () => {
  it("should format simple key", () => {
    const shortcut: ShortcutConfig = { key: "a", handler: vi.fn() };
    expect(formatShortcut(shortcut, false)).toBe("A");
  });

  it("should format Ctrl shortcut for Windows/Linux", () => {
    const shortcut: ShortcutConfig = { key: "n", ctrl: true, handler: vi.fn() };
    expect(formatShortcut(shortcut, false)).toBe("Ctrl+N");
  });

  it("should format Ctrl shortcut for Mac", () => {
    const shortcut: ShortcutConfig = { key: "n", ctrl: true, handler: vi.fn() };
    expect(formatShortcut(shortcut, true)).toBe("⌘N");
  });

  it("should format Shift shortcut", () => {
    const shortcut: ShortcutConfig = {
      key: "s",
      ctrl: true,
      shift: true,
      handler: vi.fn(),
    };
    expect(formatShortcut(shortcut, false)).toBe("Ctrl+Shift+S");
    expect(formatShortcut(shortcut, true)).toBe("⌘⇧S");
  });

  it("should format Alt shortcut", () => {
    const shortcut: ShortcutConfig = {
      key: "f4",
      alt: true,
      handler: vi.fn(),
    };
    expect(formatShortcut(shortcut, false)).toBe("Alt+F4");
    expect(formatShortcut(shortcut, true)).toBe("⌥F4");
  });

  it("should format complex shortcut", () => {
    const shortcut: ShortcutConfig = {
      key: "t",
      ctrl: true,
      shift: true,
      alt: true,
      handler: vi.fn(),
    };
    expect(formatShortcut(shortcut, false)).toBe("Ctrl+Shift+Alt+T");
    expect(formatShortcut(shortcut, true)).toBe("⌘⇧⌥T");
  });

  it("should handle meta key explicitly", () => {
    const shortcut: ShortcutConfig = { key: "n", meta: true, handler: vi.fn() };
    // meta flag is not used in the implementation, so it behaves like no modifier
    expect(formatShortcut(shortcut, false)).toBe("N");
  });
});
