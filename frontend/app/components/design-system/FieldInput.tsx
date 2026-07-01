'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon?: ReactNode
}

export default function FieldInput({ label, icon, id, className, ...props }: FieldInputProps) {
  const inputId = id ?? props.name

  return (
    <div className="hrt-field">
      <label className="label hrt-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="hrt-field-control">
        <input id={inputId} className={`input hrt-field-input${className ? ` ${className}` : ''}`} {...props} />
        {icon ? <span className="hrt-field-icon" aria-hidden>{icon}</span> : null}
      </div>
    </div>
  )
}
