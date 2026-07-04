'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useFocusTrap } from '@/app/lib/useFocusTrap'
import { Button } from '../ui/Button'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    setOpen(false)
    setOptions(null)
    resolverRef.current?.(result)
    resolverRef.current = null
  }, [])

  const value = useMemo(() => ({ confirm }), [confirm])
  const trapRef = useFocusTrap(open, () => close(false))

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {open && options ? (
        <div
          className="ds-dialog-backdrop"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            ref={trapRef}
            className="ds-dialog card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ds-confirm-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close(false)
            }}
          >
            <h2 id="ds-confirm-title" className="ds-dialog-title">
              {options.title}
            </h2>
            {options.message ? <p className="ds-dialog-message">{options.message}</p> : null}
            <div className="ds-dialog-actions">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? t('confirmCancel')}
              </Button>
              <Button
                type="button"
                variant={options.variant === 'danger' ? 'danger' : 'accent'}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? t('confirmOk')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}
