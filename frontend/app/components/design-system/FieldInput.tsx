'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: ReactNode
  /** id of an element (e.g. an error <p>) that describes this field; only pass when that element is actually rendered. */
  describedBy?: string
}

export default function FieldInput({ label, icon, id, className, describedBy, ...props }: FieldInputProps) {
  const inputId = id ?? props.name
  const ariaDescribedBy = describedBy ?? props['aria-describedby']

  return (
    <div className="hrt-field">
      <label className="label hrt-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="hrt-field-control">
        <input
          id={inputId}
          className={`input hrt-field-input${className ? ` ${className}` : ''}`}
          {...props}
          aria-describedby={ariaDescribedBy}
        />
        {icon ? <span className="hrt-field-icon" aria-hidden>{icon}</span> : null}
      </div>
    </div>
  )
}
