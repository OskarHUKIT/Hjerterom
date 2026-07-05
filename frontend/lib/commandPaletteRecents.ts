const STORAGE_KEY = 'hjerterum-command-palette-recents'
const MAX_RECENTS = 5

export type CommandPaletteRecentEntity = {
  id: string
  kind: 'route' | 'listing' | 'inquiry'
  title: string
  subtitle?: string
  href: string
  timestamp: number
}

function readRecents(): CommandPaletteRecentEntity[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CommandPaletteRecentEntity[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecents(items: CommandPaletteRecentEntity[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTS)))
}

export function getCommandPaletteRecents(): CommandPaletteRecentEntity[] {
  return readRecents()
}

export function recordCommandPaletteVisit(entity: Omit<CommandPaletteRecentEntity, 'timestamp'>) {
  const now = Date.now()
  const withoutDup = readRecents().filter((item) => item.id !== entity.id)
  writeRecents([{ ...entity, timestamp: now }, ...withoutDup])
}

export function touchCommandPaletteRecent(id: string) {
  const items = readRecents()
  const match = items.find((item) => item.id === id)
  if (!match) return
  recordCommandPaletteVisit({
    id: match.id,
    kind: match.kind,
    title: match.title,
    subtitle: match.subtitle,
    href: match.href,
  })
}
