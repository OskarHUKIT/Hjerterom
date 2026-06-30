/** Parser kommune_region uansett format fra DB. */
export function parseKommuneRegions(val: string | string[] | null | undefined): string[] {
  if (val == null) return []
  if (Array.isArray(val)) return val.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
  let s = String(val).trim()
  if (!s) return []
  s = s.replace(/^["\\]+|["\\]+$/g, '').trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      return Array.isArray(arr)
        ? arr.map((r: unknown) => String(r).trim().toLowerCase()).filter(Boolean)
        : []
    } catch {
      return []
    }
  }
  const regionStr = s.replace(/\s+og\s+/gi, ',').replace(/[,;\n]+/g, ',')
  return regionStr
    .split(',')
    .map((r: string) =>
      r
        .replace(/^["'\s\\]+|["'\s\\]+$/g, '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
}
