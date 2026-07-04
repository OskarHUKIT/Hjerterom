'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'

import { CalendarWithRangeSelection } from '@/app/components/ui/calendar-with-range-selection'

type RangeDatePickerProps = {
  checkIn: string
  checkOut: string
  onChange: (next: { checkIn: string; checkOut: string }) => void
  checkInLabel: string
  checkOutLabel: string
  placeholder: string
  className?: string
  minNights?: number
  maxNights?: number
  hint?: string | null
}

/** Popover range calendar for Finn search (NPD-5 #11). */
export default function RangeDatePicker({
  checkIn,
  checkOut,
  onChange,
  checkInLabel,
  checkOutLabel,
  placeholder,
  className,
  minNights,
  maxNights,
  hint,
}: RangeDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [months, setMonths] = useState(2)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setMonths(mq.matches ? 2 : 1)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
        <CalendarDays size={16} aria-hidden />
        <span>{summary}</span>
      </button>
      {open ? (
        <div className="ds-range-picker__popover ds-range-picker__popover--calendar" role="dialog">
          <div className="ds-range-picker__calendar-labels" aria-hidden>
            <span>{checkInLabel}</span>
            <span>{checkOutLabel}</span>
          </div>
          <CalendarWithRangeSelection
            variant="tourist"
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(next) => {
              onChange(next)
              if (next.checkIn && next.checkOut) setOpen(false)
            }}
            numberOfMonths={months}
            minNights={minNights}
            maxNights={maxNights}
            hint={hint}
          />
        </div>
      ) : null}
    </div>
  )
}
