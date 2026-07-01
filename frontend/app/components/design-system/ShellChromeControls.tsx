'use client'

import { Globe, Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

type ShellChromeControlsProps = {
  className?: string
  compact?: boolean
}

/** Shared language + theme controls for Finn/Los module shells (PRD §15.8 M2). */
export default function ShellChromeControls({
  className,
  compact = false,
}: ShellChromeControlsProps) {
  const { locale, setLocale, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className={`shell-chrome-controls${className ? ` ${className}` : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 'var(--space-2)' : 'var(--space-3)',
        flexShrink: 0,
      }}
    >
      <div
        className="shell-chrome-lang"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        aria-label={t('language')}
      >
        <Globe size={compact ? 16 : 18} style={{ opacity: 0.85, color: 'var(--text-muted)' }} aria-hidden />
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'no' | 'se' | 'en')}
          className="shell-chrome-lang-select"
          style={{
            margin: 0,
            minHeight: 'var(--touch-target-sm)',
            height: 'var(--touch-target-sm)',
            boxSizing: 'border-box',
            padding: '0 10px',
            borderRadius: 8,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: compact ? '0.8rem' : '0.85rem',
            maxWidth: compact ? '120px' : '150px',
          }}
        >
          <option value="no">{t('norwegian')}</option>
          <option value="se">{t('sami')}</option>
          <option value="en">{t('english')}</option>
        </select>
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="shell-chrome-theme-btn"
        aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minWidth: 'var(--touch-target-sm)',
          minHeight: 'var(--touch-target-sm)',
          padding: compact ? '0 8px' : '0 12px',
          borderRadius: 8,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          fontSize: compact ? '0.8rem' : '0.85rem',
          fontWeight: 600,
        }}
      >
        {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        {!compact && <span>{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>}
      </button>
    </div>
  )
}
