/**
 * Name lookup for the dashboard's search boxes: a substring match where one
 * exists, and a short-edit-distance guess where none does, so a name typed
 * slightly wrong still finds its record.
 */

const BENGALI_ZERO = "০".codePointAt(0)!;

/** Bengali numerals type the same as Latin ones as far as matching goes. */
export function toLatinDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(d.codePointAt(0)! - BENGALI_ZERO));
}

function normalise(s: string): string {
  return toLatinDigits(s).trim().toLowerCase();
}

/**
 * Levenshtein distance, abandoned as soon as every cell of a row is past
 * `max` — the caller only ever cares about "close enough", and the strings
 * here are names typed by hand.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        curr[j - 1]! + 1,
        prev[j]! + 1,
        prev[j - 1]! + cost
      );
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prev = curr.slice();
  }
  return prev[b.length]!;
}

/** One typo forgiven on a short query, two once there is more to go on. */
function tolerance(query: string): number {
  return query.length < 5 ? 1 : 2;
}

/**
 * The closest any window of `name` as long as the query comes to it. A typo
 * inside a long shop name should still match on the part that was typed.
 */
function closestWindow(name: string, query: string, max: number): number {
  if (name.length <= query.length) return editDistance(name, query, max);
  let best = max + 1;
  for (let i = 0; i + query.length <= name.length; i++) {
    const d = editDistance(name.slice(i, i + query.length), query, max);
    if (d < best) best = d;
    if (best === 0) break;
  }
  return best;
}

export type NameMatch<T> = {
  item: T;
  /** True when only the typo-forgiving pass found it. */
  approximate: boolean;
};

/**
 * Records whose name contains the query, in the order given. Only when there
 * are none does the edit-distance pass run, so a name that matches exactly is
 * never buried under guesses.
 */
export function matchByName<T>(
  items: T[],
  query: string,
  name: (item: T) => string,
  limit = 20
): Array<NameMatch<T>> {
  const q = normalise(query);
  if (!q) return [];

  const exact: Array<NameMatch<T>> = [];
  for (const item of items) {
    if (normalise(name(item)).includes(q)) {
      exact.push({ item, approximate: false });
      if (exact.length >= limit) return exact;
    }
  }
  if (exact.length) return exact;

  const max = tolerance(q);
  const near: Array<{ item: T; distance: number }> = [];
  for (const item of items) {
    const candidate = normalise(name(item));
    if (!candidate) continue;
    const distance = closestWindow(candidate, q, max);
    if (distance <= max) near.push({ item, distance });
  }
  return near
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ item }) => ({ item, approximate: true }));
}
