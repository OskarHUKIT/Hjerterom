'use client'

export type BookingTimelineStep = {
  id: string
  label: string
  description?: string
}

type BookingTimelineProps = {
  steps: BookingTimelineStep[]
  activeIndex: number
  className?: string
}

/** Vertical booking status timeline (NPD-5 #13). */
export default function BookingTimeline({ steps, activeIndex, className }: BookingTimelineProps) {
  return (
    <ol className={`ds-booking-timeline${className ? ` ${className}` : ''}`}>
      {steps.map((step, index) => {
        const done = index < activeIndex
        const current = index === activeIndex
        const stateClass = done ? ' ds-booking-timeline__item--done' : current ? ' ds-booking-timeline__item--current' : ''
        return (
          <li key={step.id} className={`ds-booking-timeline__item${stateClass}`}>
            <span className="ds-booking-timeline__dot" aria-hidden />
            <div>
              <div className="ds-booking-timeline__label">{step.label}</div>
              {step.description ? (
                <div className="ds-booking-timeline__desc">{step.description}</div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function bookingTimelineActiveIndex(status: string): number {
  const s = status.toLowerCase()
  if (s === 'paid' || s === 'completed' || s === 'checked_in') return 3
  if (s === 'accepted') return 2
  if (s === 'pending') return 1
  if (s === 'cancelled' || s === 'rejected') return 0
  return 1
}
