'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'

type RangeDatePickerProps = {
  checkIn: string
  checkOut: string
  onChange: (next: { checkIn: string; checkOut: string }) => void
  checkInLabel: string
  checkOutLabel: string
  placeholder: string
  className?: string
}

/** Popover date range for Finn search (NPD-5 #11). */
export default function RangeDatePicker({
  checkIn,
  checkOut,
  onChange,
  checkInLabel,
  checkOutLabel,
  placeholder,
  className,
}: RangeDatePickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const summary =
    checkIn && checkOut
      ? `${checkIn} – ${checkOut}`
      : checkIn
        ? checkIn
        : placeholder

  return (
    <div className={`ds-range-picker${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        type="button"
        className="ds-range-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Calendar size={16} aria-hidden />
        <span>{summary}</span>
      </button>
      {open ? (
        <div className="ds-range-picker__popover" role="dialog">
          <div className="ds-range-picker__fields">
            <label>
              {checkInLabel}
              <input
                type="date"
                value={checkIn}
                onChange={(e) => onChange({ checkIn: e.target.value, checkOut })}
              />
            </label>
            <label>
              {checkOutLabel}
              <input
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(e) => onChange({ checkIn, checkOut: e.target.value })}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}
