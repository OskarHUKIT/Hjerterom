import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'danger'
  | 'ghost'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'button',
  secondary: 'button button-secondary',
  accent: 'button button-accent',
  success: 'button button-success',
  danger: 'button button-danger',
  ghost: 'button button-ghost',
}

/** CSS-klasser for knapper — bruk på `<Link className={buttonClassName('accent')} />` osv. */
export function buttonClassName(variant: ButtonVariant = 'primary', extra?: string): string {
  return [variantClass[variant], extra].filter(Boolean).join(' ')
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

/**
 * Knapp med eksplisitt variant (mapper til eksisterende `.button*` i globals.css).
 */
export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  )
}
