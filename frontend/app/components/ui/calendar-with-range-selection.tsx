'use client'

import * as React from 'react'
import { type DateRange, type Matcher, type ModifiersClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Calendar, type CalendarProps } from '@/app/components/ui/calendar'

export type AvailabilityCalendarVariant = 'homeowner' | 'tourist'

export function ymdToLocalDate(ymd: string | null | undefined): Date | undefined {
  if (!ymd) return undefined
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function localDateToYmd(date: Date | undefined): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type CalendarWithRangeSelectionProps = {
  variant?: AvailabilityCalendarVariant
  checkIn?: string
  checkOut?: string
  onChange?: (next: { checkIn: string; checkOut: string }) => void
  minNights?: number
  maxNights?: number
  numberOfMonths?: number
  className?: string
  calendarClassName?: string
  hint?: string | null
  disabled?: Matcher | Matcher[]
  modifiers?: Record<string, Matcher | Matcher[] | undefined>
  modifiersClassNames?: ModifiersClassNames
  defaultMonth?: Date
} & Omit<
  CalendarProps,
  'mode' | 'selected' | 'onSelect' | 'min' | 'max' | 'numberOfMonths' | 'disabled' | 'modifiers' | 'modifiersClassNames' | 'defaultMonth'
>

export function CalendarWithRangeSelection({
  variant = 'tourist',
  checkIn = '',
  checkOut = '',
  onChange,
  minNights,
  maxNights,
  numberOfMonths = 2,
  className,
  calendarClassName,
  hint,
  disabled,
  modifiers,
  modifiersClassNames,
  defaultMonth,
  ...calendarProps
}: CalendarWithRangeSelectionProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const from = ymdToLocalDate(checkIn)
    const to = ymdToLocalDate(checkOut)
    if (!from && !to) return undefined
    return { from, to }
  })

  React.useEffect(() => {
    const from = ymdToLocalDate(checkIn)
    const to = ymdToLocalDate(checkOut)
    if (!from && !to) {
      setDateRange(undefined)
      return
    }
    setDateRange({ from, to })
  }, [checkIn, checkOut])

  const handleSelect = (next: DateRange | undefined) => {
    setDateRange(next)
    onChange?.({
      checkIn: localDateToYmd(next?.from),
      checkOut: localDateToYmd(next?.to),
    })
  }

  const variantClass =
    variant === 'homeowner' ? 'calendar-range calendar-range--homeowner' : 'calendar-range calendar-range--tourist'

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', variantClass, className)}>
      <Calendar
        mode="range"
        defaultMonth={defaultMonth ?? dateRange?.from ?? new Date()}
        selected={dateRange}
        onSelect={handleSelect}
        numberOfMonths={numberOfMonths}
        min={minNights}
        max={maxNights}
        disabled={disabled}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        className={cn('rounded-lg border border-border bg-card shadow-sm', calendarClassName)}
        {...calendarProps}
      />
      {hint ? <p className="calendar-range__hint">{hint}</p> : null}
    </div>
  )
}
