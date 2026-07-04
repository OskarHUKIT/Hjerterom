'use client'

import { Check } from 'lucide-react'

export type StepperStep = {
  id: string
  label: string
}

type StepperProps = {
  steps: StepperStep[]
  currentStep: number
  className?: string
  /** ravikatiyar/registration-stepper — horizontal scroll on narrow viewports */
  variant?: 'default' | 'registration'
  ariaLabel?: string
}

/** Horizontal stepper — completed steps show a checkmark (NPD-5 #16). */
export default function Stepper({
  steps,
  currentStep,
  className,
  variant = 'default',
  ariaLabel = 'Progress',
}: StepperProps) {
  return (
    <nav
      className={`ds-stepper${variant === 'registration' ? ' ds-stepper--registration' : ''}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      {steps.map((step, index) => {
        const done = index < currentStep
        const current = index === currentStep
        const stateClass = done ? ' ds-stepper__step--done' : current ? ' ds-stepper__step--current' : ''
        return (
          <div
            key={step.id}
            className={`ds-stepper__step${stateClass}`}
            aria-current={current ? 'step' : undefined}
          >
            <span className="ds-stepper__dot" aria-hidden>
              {done ? <Check size={14} strokeWidth={3} /> : index + 1}
            </span>
            <span className="ds-stepper__label">{step.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
