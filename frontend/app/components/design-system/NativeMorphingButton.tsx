'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { CalendarPlus, Plus, X } from 'lucide-react'

export type NativeMorphingButtonAction = {
  id: string
  label: string
  onClick: () => void
  tone?: 'open' | 'closed' | 'neutral'
}

export type NativeMorphingButtonPresetGroup = {
  label: string
  items: NativeMorphingButtonAction[]
}

type NativeMorphingButtonProps = {
  ariaLabel: string
  closeLabel: string
  actions: NativeMorphingButtonAction[]
  presetGroup?: NativeMorphingButtonPresetGroup
  className?: string
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}

/** reapollo.ui/native-morphing-button — fixed FAB with fan-out actions; simple menu when reduced motion. */
export default function NativeMorphingButton({
  ariaLabel,
  closeLabel,
  actions,
  presetGroup,
  className,
}: NativeMorphingButtonProps) {
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const close = useCallback(() => {
    setOpen(false)
    setPresetsOpen(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [close, open])

  const runAction = (action: NativeMorphingButtonAction) => {
    action.onClick()
    close()
  }

  const fanActions = presetGroup && presetsOpen ? presetGroup.items : actions

  if (reducedMotion) {
    return (
      <div
        ref={rootRef}
        className={`ds-native-morph-fab ds-native-morph-fab--simple${className ? ` ${className}` : ''}`}
      >
        <details className="ds-native-morph-fab__menu">
          <summary className="ds-native-morph-fab__trigger" aria-label={ariaLabel}>
            <Plus size={22} aria-hidden />
          </summary>
          <div className="ds-native-morph-fab__panel" role="menu">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className={`ds-native-morph-fab__item ds-native-morph-fab__item--${action.tone ?? 'neutral'}`}
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            ))}
            {presetGroup ? (
              <>
                <p className="ds-native-morph-fab__group-label">{presetGroup.label}</p>
                {presetGroup.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className="ds-native-morph-fab__item ds-native-morph-fab__item--neutral"
                    onClick={() => runAction(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </details>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={`ds-native-morph-fab${open ? ' ds-native-morph-fab--open' : ''}${presetsOpen ? ' ds-native-morph-fab--presets' : ''}${className ? ` ${className}` : ''}`}
    >
      {open ? (
        <button
          type="button"
          className="ds-native-morph-fab__backdrop"
          aria-label={closeLabel}
          onClick={close}
        />
      ) : null}

      <div className="ds-native-morph-fab__stack" role="group" aria-label={ariaLabel}>
        {open
          ? fanActions.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className={`ds-native-morph-fab__action ds-native-morph-fab__action--${action.tone ?? 'neutral'}`}
                style={{ '--morph-index': index } as CSSProperties}
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            ))
          : null}

        {open && presetGroup && !presetsOpen ? (
          <button
            type="button"
            className="ds-native-morph-fab__action ds-native-morph-fab__action--neutral"
            style={{ '--morph-index': actions.length } as CSSProperties}
            onClick={() => setPresetsOpen(true)}
          >
            <CalendarPlus size={16} aria-hidden />
            {presetGroup.label}
          </button>
        ) : null}

        {open && presetsOpen && presetGroup ? (
          <button
            type="button"
            className="ds-native-morph-fab__action ds-native-morph-fab__action--neutral ds-native-morph-fab__action--back"
            style={{ '--morph-index': -1 } as CSSProperties}
            onClick={() => setPresetsOpen(false)}
          >
            {closeLabel}
          </button>
        ) : null}

        <button
          type="button"
          className="ds-native-morph-fab__trigger"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? closeLabel : ariaLabel}
          onClick={() => {
            if (open) close()
            else setOpen(true)
          }}
        >
          {open ? <X size={24} aria-hidden /> : <Plus size={24} aria-hidden />}
        </button>
      </div>
    </div>
  )
}
