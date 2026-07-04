'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export type AccordionChevronItem = {
  id: string
  /** Stable DOM id for scroll targets (e.g. hub-tourism). */
  domId?: string
  title: string
  icon?: ReactNode
  content: ReactNode
  hidden?: boolean
}

type Props = {
  items: AccordionChevronItem[]
  openId: string | null
  onOpenChange: (id: string | null) => void
  /** Accessible label for expand action — include panel title via caller. */
  getExpandLabel: (title: string) => string
  /** Accessible label for collapse action — include panel title via caller. */
  getCollapseLabel: (title: string) => string
  className?: string
  ariaLabel?: string
}

/** OriginUI tabs-w-chevron pattern — single-open, card-style sections (Boly tokens). */
export default function AccordionWithChevron({
  items,
  openId,
  onOpenChange,
  getExpandLabel,
  getCollapseLabel,
  className,
  ariaLabel,
}: Props) {
  const scrollTargetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!openId) return
    const item = items.find((entry) => entry.id === openId)
    const domId = item?.domId ?? item?.id
    if (!domId || scrollTargetRef.current === openId) return
    scrollTargetRef.current = openId
    requestAnimationFrame(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [openId, items])

  const visibleItems = items.filter((item) => !item.hidden)
  if (visibleItems.length === 0) return null

  return (
    <div
      className={`ds-accordion-chevron${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      {visibleItems.map((item) => {
        const open = openId === item.id
        const domId = item.domId ?? item.id
        const triggerId = `${domId}-trigger`
        const panelId = `${domId}-panel`

        return (
          <div
            key={item.id}
            id={domId}
            className={`ds-accordion-chevron__item${open ? ' ds-accordion-chevron__item--open' : ''}`}
          >
            <button
              type="button"
              id={triggerId}
              className="ds-accordion-chevron__trigger"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? getCollapseLabel(item.title) : getExpandLabel(item.title)}
              onClick={() => onOpenChange(open ? null : item.id)}
            >
              <span className="ds-accordion-chevron__trigger-main">
                {item.icon}
                <span>{item.title}</span>
              </span>
              <ChevronDown
                size={18}
                aria-hidden
                className="ds-accordion-chevron__chevron"
              />
            </button>
            {open ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="ds-accordion-chevron__panel"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
