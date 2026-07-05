'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatDateTimeNo } from '@/app/lib/dateFormat'

export type StatusTimelineStepState =
  | 'done'
  | 'current'
  | 'upcoming'
  | 'terminal-negative'

export type StatusTimelineStep = {
  key: string
  label: string
  timestamp?: string | null
  state: StatusTimelineStepState
}

type StatusTimelineProps = {
  steps: StatusTimelineStep[]
  className?: string
  ariaLabel?: string
}

function dotClass(state: StatusTimelineStepState): string {
  switch (state) {
    case 'done':
      return 'border-cyan-400 bg-cyan-400'
    case 'current':
      return 'border-indigo-400 bg-indigo-400'
    case 'terminal-negative':
      return 'border-red-400 bg-red-400'
    default:
      return 'border-boly-text-muted/40 bg-boly-bg-card'
  }
}

function labelClass(state: StatusTimelineStepState): string {
  switch (state) {
    case 'done':
      return 'text-cyan-400'
    case 'current':
      return 'text-indigo-400'
    case 'terminal-negative':
      return 'text-red-400'
    default:
      return 'text-boly-text-muted'
  }
}

function connectorClass(from: StatusTimelineStepState, to: StatusTimelineStepState): string {
  if (from === 'terminal-negative' || to === 'terminal-negative') return 'bg-red-400'
  if (from === 'done' && to === 'done') return 'bg-cyan-400'
  if (from === 'done' && to === 'current') return 'bg-gradient-to-r from-cyan-400 to-indigo-400'
  if (from === 'current') return 'bg-indigo-400/60'
  return 'bg-boly-border-subtle'
}

function TimelineDot({ state }: { state: StatusTimelineStepState }) {
  const pulse = state === 'current'

  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center" aria-hidden>
      {pulse ? (
        <motion.span
          className="absolute inline-flex size-4 rounded-full bg-indigo-400/40"
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : null}
      <span className={cn('relative z-10 size-3 rounded-full border-2', dotClass(state))} />
    </span>
  )
}

function StepContent({ step }: { step: StatusTimelineStep }) {
  const timestamp = step.timestamp ? formatDateTimeNo(step.timestamp) : null

  return (
    <div className="min-w-0">
      <p className={cn('text-sm font-semibold leading-snug md:text-base', labelClass(step.state))}>
        {step.label}
      </p>
      {timestamp ? (
        <p className="mt-0.5 text-xs text-boly-text-muted">{timestamp}</p>
      ) : null}
    </div>
  )
}

function VerticalTimeline({ steps }: { steps: StatusTimelineStep[] }) {
  return (
    <ol className="flex flex-col md:hidden">
      {steps.map((step, index) => {
        const next = steps[index + 1]
        const showConnector = index < steps.length - 1

        return (
          <li key={step.key} className="flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <TimelineDot state={step.state} />
              {showConnector && next ? (
                <span
                  className={cn('mt-1 w-0.5 flex-1 min-h-6 rounded-full', connectorClass(step.state, next.state))}
                  aria-hidden
                />
              ) : null}
            </div>
            <StepContent step={step} />
          </li>
        )
      })}
    </ol>
  )
}

function HorizontalTimeline({ steps }: { steps: StatusTimelineStep[] }) {
  return (
    <ol className="hidden w-full md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => {
        const next = steps[index + 1]
        const showConnector = index < steps.length - 1

        return (
          <li key={step.key} className="relative flex min-w-0 flex-col items-center px-1 text-center">
            {showConnector && next ? (
              <span
                className={cn(
                  'pointer-events-none absolute left-1/2 top-1.5 h-0.5 w-full -translate-y-1/2 rounded-full',
                  connectorClass(step.state, next.state)
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative z-10 mb-2">
              <TimelineDot state={step.state} />
            </div>
            <StepContent step={step} />
          </li>
        )
      })}
    </ol>
  )
}

/** Reusable status timeline — vertical on mobile, horizontal from md. */
export function StatusTimeline({ steps, className, ariaLabel }: StatusTimelineProps) {
  if (steps.length === 0) return null

  return (
    <nav aria-label={ariaLabel} className={cn('w-full', className)}>
      <VerticalTimeline steps={steps} />
      <HorizontalTimeline steps={steps} />
    </nav>
  )
}
