'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import type { Locale } from '@/lib/translations'
import ChromeRoundButton from './ChromeRoundButton'

const LOCALE_LABEL: Record<Locale, string> = {
  no: 'NO',
  se: 'SE',
  en: 'EN',
}

const LOCALES: Locale[] = ['no', 'se', 'en']

type ShellChromeControlsProps = {
  className?: string
  compact?: boolean
  /** inline = header row; menu = stacked panel (mobile nav / hamburger) */
  variant?: 'inline' | 'menu'
}

function localeLabel(t: ReturnType<typeof useLanguage>['t'], code: Locale): string {
  if (code === 'no') return t('norwegian')
  if (code === 'se') return t('sami')
  return t('english')
}

/**
 * Shared theme + language controls — hero round-button pattern everywhere (PRD §15.2, §15.3).
 */
export default function ShellChromeControls({
  className,
  compact,
  variant = 'inline',
}: ShellChromeControlsProps) {
  const { t, locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)
  const iconSize = compact ? 14 : 16

  useEffect(() => {
    if (variant !== 'inline' || !langOpen) return
    const close = (event: MouseEvent) => {
      if (!langRef.current?.contains(event.target as Node)) {
        setLangOpen(false)
      }
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [langOpen, variant])

  const themeButton = (
    <ChromeRoundButton
      compact={compact}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'dark' ? <Sun size={iconSize} aria-hidden /> : <Moon size={iconSize} aria-hidden />}
    </ChromeRoundButton>
  )

  if (variant === 'menu') {
    return (
      <div
        className={`shell-chrome-controls shell-chrome-controls--menu${className ? ` ${className}` : ''}`}
      >
        <p className="shell-chrome-controls__menu-label">{t('settings')}</p>
        <div className="shell-chrome-controls__menu-lang" role="listbox" aria-label={t('languageLabel')}>
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={locale === code}
              className="hrt-chrome-lang-option"
              onClick={() => setLocale(code)}
            >
              <span>{LOCALE_LABEL[code]}</span>
              <span>{localeLabel(t, code)}</span>
            </button>
          ))}
        </div>
        <div className="shell-chrome-controls__menu-theme">
          <span className="shell-chrome-controls__menu-theme-label">
            {theme === 'dark' ? t('darkMode') : t('lightMode')}
          </span>
          {themeButton}
        </div>
      </div>
    )
  }

  return (
    <div className={`shell-chrome-controls${className ? ` ${className}` : ''}`}>
      <div className="hrt-chrome-lang" ref={langRef}>
        <ChromeRoundButton
          compact={compact}
          aria-label={t('languageLabel')}
          aria-expanded={langOpen}
          aria-haspopup="listbox"
          pressed={langOpen}
          onClick={(event) => {
            event.stopPropagation()
            setLangOpen((open) => !open)
          }}
        >
          <Globe size={iconSize} aria-hidden />
        </ChromeRoundButton>
        {langOpen ? (
          <ul className="hrt-chrome-lang-menu" role="listbox" aria-label={t('languageLabel')}>
            {LOCALES.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === code}
                  className="hrt-chrome-lang-option"
                  onClick={() => {
                    setLocale(code)
                    setLangOpen(false)
                  }}
                >
                  <span>{LOCALE_LABEL[code]}</span>
                  <span>{localeLabel(t, code)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {themeButton}
    </div>
  )
}
