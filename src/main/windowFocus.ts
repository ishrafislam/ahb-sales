/**
 * Who gets the screen back when a child window closes.
 *
 * Windows hands activation past the owner when an owned window is destroyed,
 * which can leave the main window sunk behind other apps — so the owner is
 * pulled forward. But reaching in while other children are still open is what
 * deactivated (and on the client's machine minimised) the dashboard: with
 * siblings still on screen Windows picks the next one itself, and a second
 * hand on the wheel leaves the owner behind. macOS and Linux need none of it.
 */

export type ParentState = {
  minimized: boolean;
  destroyed: boolean;
};

export type FocusDecision = {
  focus: boolean;
  restore: boolean;
};

const NOTHING: FocusDecision = { focus: false, restore: false };

export function shouldRestoreParent(input: {
  platform: string;
  parent: ParentState;
  /** The parent's other children still alive after this one has gone. */
  liveSiblings: number;
}): FocusDecision {
  if (input.platform !== "win32") return NOTHING;
  if (input.parent.destroyed) return NOTHING;
  // Another child still holds the screen: leave the order alone
  if (input.liveSiblings > 0) return NOTHING;
  return { focus: true, restore: input.parent.minimized };
}
