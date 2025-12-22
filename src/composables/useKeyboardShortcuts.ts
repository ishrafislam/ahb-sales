import { onMounted, onUnmounted } from "vue";

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description?: string;
}

/**
 * Composable for registering keyboard shortcuts
 * Automatically handles platform differences (Ctrl on Windows/Linux, Cmd on Mac)
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't interfere with input fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();

      // Handle platform-specific modifier keys
      // When ctrl is specified, use Cmd (metaKey) on Mac, Ctrl on Windows/Linux
      const ctrlMatches = shortcut.ctrl
        ? isMac
          ? e.metaKey
          : e.ctrlKey
        : !e.ctrlKey && !e.metaKey;

      const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;

      const altMatches = shortcut.alt ? e.altKey : !e.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.handler(e);
        break;
      }
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown, true);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown, true);
  });

  return {
    isMac,
  };
}

/**
 * Helper to format shortcut display text
 */
export function formatShortcut(
  shortcut: ShortcutConfig,
  isMac = false
): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? "⌘" : "Ctrl");
  }
  if (shortcut.shift) {
    parts.push(isMac ? "⇧" : "Shift");
  }
  if (shortcut.alt) {
    parts.push(isMac ? "⌥" : "Alt");
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? "" : "+");
}
