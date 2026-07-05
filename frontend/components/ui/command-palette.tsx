"use client"

import * as React from "react"
import { Search, Command as CommandIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

export type CommandPaletteSectionId = "recent" | "navigation" | "listings" | "actions"

export type CommandPaletteItem = {
  id: string
  section: CommandPaletteSectionId
  title: string
  subtitle?: string
  icon?: LucideIcon
  keywords?: string[]
  onSelect: () => void
}

export type CommandPaletteSection = {
  id: CommandPaletteSectionId
  label: string
  items: CommandPaletteItem[]
}

export type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (value: string) => void
  sections: CommandPaletteSection[]
  placeholder: string
  emptyLabel: string
  resultsCountLabel: string
  searching?: boolean
  footerHint?: string
}

function itemMatchesQuery(item: CommandPaletteItem, q: string): boolean {
  if (!q) return true
  const haystack = [item.title, item.subtitle, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  sections,
  placeholder,
  emptyLabel,
  resultsCountLabel,
  searching,
  footerHint,
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const normalizedQuery = query.trim().toLowerCase()

  const visibleSections = React.useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => itemMatchesQuery(item, normalizedQuery)),
      }))
      .filter((section) => section.items.length > 0)
  }, [sections, normalizedQuery])

  const flatItems = React.useMemo(
    () => visibleSections.flatMap((section) => section.items),
    [visibleSections]
  )

  const itemIndexById = React.useMemo(() => {
    const map = new Map<string, number>()
    flatItems.forEach((item, index) => map.set(item.id, index))
    return map
  }, [flatItems])

  const resultCount = flatItems.length

  React.useEffect(() => {
    if (open) {
      setSelectedIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      onQueryChange("")
    }
  }, [open, onQueryChange])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query, sections])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onOpenChange(false)
        return
      }
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(flatItems.length - 1, 0)))
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      }
      if (event.key === "Enter" && flatItems[selectedIndex]) {
        event.preventDefault()
        flatItems[selectedIndex].onSelect()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, flatItems, selectedIndex, onOpenChange])

  React.useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedIndex])

  React.useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="hrt-command-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={placeholder}
            className="hrt-command-palette"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="hrt-command-palette__search">
              <Search className="hrt-command-palette__search-icon" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={placeholder}
                className="hrt-command-palette__input"
                aria-controls="hrt-command-palette-listbox"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hrt-command-palette__kbd">Esc</kbd>
            </div>

            <div
              id="hrt-command-palette-status"
              className="hrt-command-palette-sr-only"
              aria-live="polite"
              aria-atomic="true"
            >
              {searching ? "…" : resultsCountLabel.replace("{count}", String(resultCount))}
            </div>

            <div
              id="hrt-command-palette-listbox"
              role="listbox"
              className="hrt-command-palette__results custom-scrollbar"
            >
              {flatItems.length === 0 && !searching ? (
                <div className="hrt-command-palette__empty">{emptyLabel}</div>
              ) : null}

              {visibleSections.map((section) => (
                <div key={section.id} className="hrt-command-palette__section">
                  <p className="hrt-command-palette__section-label">{section.label}</p>
                  {section.items.map((item) => {
                    const index = itemIndexById.get(item.id) ?? 0
                    const Icon = item.icon
                    const selected = index === selectedIndex
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[index] = el
                        }}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`hrt-command-palette__item${selected ? " hrt-command-palette__item--selected" : ""}`}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => item.onSelect()}
                      >
                        <span className="hrt-command-palette__item-icon">
                          {Icon ? <Icon size={14} aria-hidden /> : null}
                        </span>
                        <span className="hrt-command-palette__item-copy">
                          <span className="hrt-command-palette__item-title">{item.title}</span>
                          {item.subtitle ? (
                            <span className="hrt-command-palette__item-subtitle">{item.subtitle}</span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}

              {searching ? (
                <div className="hrt-command-palette__loading">{emptyLabel}</div>
              ) : null}
            </div>

            <div className="hrt-command-palette__footer">
              <div className="hrt-command-palette__footer-left">
                <CommandIcon size={14} aria-hidden />
                <span>+</span>
                <kbd className="hrt-command-palette__kbd">K</kbd>
              </div>
              <div className="hrt-command-palette__footer-right">
                <span>{footerHint ?? "↑↓"}</span>
                <kbd className="hrt-command-palette__kbd">↵</kbd>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default CommandPalette
