'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export type ToastVariant = 'info' | 'success' | 'error'

type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = crypto.randomUUID()
      setItems((prev) => [...prev, { id, message, variant }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ds-toast-region" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <div
            key={item.id}
            className={`ds-toast ds-toast--${item.variant}`}
            role="status"
          >
            <span>{item.message}</span>
            <button
              type="button"
              className="ds-toast-dismiss"
              onClick={() => dismiss(item.id)}
              aria-label={t('toastDismiss')}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
