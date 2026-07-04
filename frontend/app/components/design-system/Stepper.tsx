'use client'

export type StepperStep = {
  id: string
  label: string
}

type StepperProps = {
  steps: StepperStep[]
  currentStep: number
  className?: string
}

/** Horizontal stepper — future steps are display-only (NPD-5 #14). */
export default function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav
      className={`ds-stepper${className ? ` ${className}` : ''}`}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const done = index < currentStep
        const current = index === currentStep
        const stateClass = done ? ' ds-stepper__step--done' : current ? ' ds-stepper__step--current' : ''
        return (
          <div key={step.id} className={`ds-stepper__step${stateClass}`} aria-current={current ? 'step' : undefined}>
            <span className="ds-stepper__dot" aria-hidden>
              {done ? '✓' : index + 1}
            </span>
            <span className="ds-stepper__label">{step.label}</span>
          </div>
        )
      })}
    </nav>
  )
}
