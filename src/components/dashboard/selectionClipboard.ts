/**
 * The entry grid's rows on the clipboard.
 *
 * Tab-separated text, so the same copy that fills the Select Print sheet also
 * pastes into a spreadsheet or a message. Always Latin digits: this is machine
 * data, and Bengali numerals are put on at render time.
 */
import { toLatinDigits } from "../../utils/numerals";

export type SheetRow = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
};

export function rowsToTsv(rows: SheetRow[]): string {
  return rows
    .map((r) => [r.id, r.name, r.quantity, r.unit].join("\t"))
    .join("\n");
}

/**
 * Read back what `rowsToTsv` wrote — leniently, since the text may have been
 * through a spreadsheet or an editor on the way. A line without an id and a
 * quantity is not a row and is dropped rather than pasted as zeroes.
 */
export function tsvToRows(text: string): SheetRow[] {
  return toLatinDigits(text ?? "")
    .split(/\r?\n/)
    .flatMap((line) => {
      if (!line.trim()) return [];
      const [idText = "", name = "", qtyText = "", unit = ""] = line.split("\t");
      const id = Number.parseInt(idText.trim(), 10);
      const quantity = Number.parseFloat(qtyText.trim());
      if (!Number.isFinite(id) || !Number.isFinite(quantity)) return [];
      return [{ id, name: name.trim(), quantity, unit: unit.trim() }];
    });
}
