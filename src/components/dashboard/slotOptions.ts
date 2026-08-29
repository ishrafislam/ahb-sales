/**
 * The dashboard's customer and product IDs are slots, not a growing list:
 * 1..1000, most of them empty at any time. The dropdowns show every slot, so
 * these helpers pad the saved records out to the full range and filter it.
 */

import { toLatinDigits } from "../../utils/fuzzy";

export type SlotOption = {
  id: number;
  /** The record's name; empty for a slot nothing is saved in yet. */
  primary: string;
  /** Address for a customer, description for a product. */
  secondary?: string;
};

/**
 * Every slot from 1 to `max`, with the saved records merged in. Records
 * outside the range are ignored — the id fields cannot reach them anyway.
 */
export function toSlots(
  records: Array<{ id: number; primary: string; secondary?: string }>,
  max: number
): SlotOption[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const slots: SlotOption[] = [];
  for (let id = 1; id <= max; id++) {
    const rec = byId.get(id);
    slots.push({
      id,
      primary: rec?.primary ?? "",
      ...(rec?.secondary ? { secondary: rec.secondary } : {}),
    });
  }
  return slots;
}

/**
 * Narrow the list to what the typed text could mean. A number matches ids that
 * start with it — typing "21" is on the way to 21 as much as to 214 — and any
 * text also matches the name or the address/description.
 */
export function filterSlots(all: SlotOption[], query: string): SlotOption[] {
  const q = toLatinDigits(query.trim()).toLowerCase();
  if (!q) return all;
  const numeric = /^\d+$/.test(q);
  // The id field sits at "000" until it is typed into, and a padded id means
  // the same slot as a bare one
  const digits = numeric ? q.replace(/^0+/, "") : q;
  if (numeric && !digits) return all;
  return all.filter((s) => {
    if (numeric && String(s.id).startsWith(digits)) return true;
    if (s.primary.toLowerCase().includes(q)) return true;
    return (s.secondary ?? "").toLowerCase().includes(q);
  });
}
