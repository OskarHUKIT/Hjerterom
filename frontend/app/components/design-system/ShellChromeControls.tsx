'use client'

import { Globe } from 'lucide-react'
import { CurtainThemeToggle } from '@/app/components/ui/curtain-theme-toggle'
import { useLanguage } from '@/context/LanguageContext'
import type { Locale } from '@/lib/translations'

type ShellChromeControlsProps = {
  className?: string
  compact?: boolean
}

/**
 * Shared theme + language controls for Finn, Los, and other module shells (PRD §15.2, §15.3).
 */
export default function ShellChromeControls({ className, compact }: ShellChromeControlsProps) {
  const { t, locale, setLocale } = useLanguage()

  return (
    <div className={`shell-chrome-controls${className ? ` ${className}` : ''}`}>
      <label className="shell-chrome-controls__item">
        <Globe size={compact ? 14 : 16} aria-hidden />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          aria-label={t('languageLabel')}
          className="shell-chrome-controls__select"
        >
          <option value="no">{t('norwegian')}</option>
          <option value="se">{t('sami')}</option>
          <option value="en">{t('english')}</option>
        </select>
      </label>
      <CurtainThemeToggle variant="chrome" compact={compact} />
    </div>
  )
}
