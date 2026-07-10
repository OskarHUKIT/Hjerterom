/**
 * Safe alternative to PostgREST `.or(`guest_user_id.eq.${userId},guest_email.eq.${email}`)`.
 *
 * String-interpolating a user-controlled value (like an email) directly into a PostgREST
 * `.or()` filter string is unsafe: the `or=` filter syntax uses `,` to separate conditions
 * and `()` to group them, so a value containing those characters can reshape the filter
 * instead of just being compared for equality. Row Level Security limits the blast radius,
 * but the pattern itself is a filter-injection footgun and shouldn't be repeated.
 *
 * The safe replacement is two separate `.eq()` queries (one per column) run in parallel,
 * merged client-side. `mergeUniqueById` makes that merge exact rather than approximate:
 * given two sources independently sorted by the same key and each limited to N, the true
 * top-N of their union is always a subset of (top-N of source A) ∪ (top-N of source B) —
 * any element that belongs in the global top-N must already be in its own source's top-N
 * (otherwise N higher-ranked same-source elements would have already pushed it out). So
 * deduping the two top-N lists by id, re-sorting, and re-slicing to N reproduces exactly
 * what a single `columnA.eq.x OR columnB.eq.y ORDER BY ... LIMIT N` query would return.
 */
export function mergeUniqueById<T extends { id: string }>(
  a: readonly T[],
  b: readonly T[],
  compare: (x: T, y: T) => number,
  limit?: number
): T[] {
  const byId = new Map<string, T>()
  for (const row of a) byId.set(row.id, row)
  for (const row of b) byId.set(row.id, row)
  const merged = Array.from(byId.values()).sort(compare)
  return typeof limit === 'number' ? merged.slice(0, limit) : merged
}
