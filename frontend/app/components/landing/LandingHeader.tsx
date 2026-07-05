'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe, Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import type { Locale } from '@/lib/translations'
import LandingRoundButton from './LandingRoundButton'
import Logo from '../Logo'

const LOCALE_LABEL: Record<Locale, string> = {
  no: 'NO',
  se: 'SE',
  en: 'EN',
}

export default function LandingHeader() {
  const { t, locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!langRef.current?.contains(event.target as Node)) {
        setLangOpen(false)
      }
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link prefetch={false} href="/" className="landing-header__brand" aria-label={t('goHome')}>
          <Logo />
        </Link>

        <div className="landing-header__actions">
          <Link prefetch={false} href="/login" className="landing-header__login">
            {t('logIn')}
            <ArrowRight size={14} aria-hidden />
          </Link>

          <div className="landing-header__lang" ref={langRef}>
            <LandingRoundButton
              aria-label={t('languageLabel')}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              pressed={langOpen}
              onClick={(event) => {
                event.stopPropagation()
                setLangOpen((open) => !open)
              }}
            >
              <Globe size={16} aria-hidden />
            </LandingRoundButton>
            {langOpen ? (
              <ul className="landing-header__lang-menu" role="listbox" aria-label={t('languageLabel')}>
                {(['no', 'se', 'en'] as Locale[]).map((code) => (
                  <li key={code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={locale === code}
                      className="landing-header__lang-option"
                      onClick={() => {
                        setLocale(code)
                        setLangOpen(false)
                      }}
                    >
                      <span>{LOCALE_LABEL[code]}</span>
                      <span>{t(code === 'no' ? 'norwegian' : code === 'se' ? 'sami' : 'english')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <LandingRoundButton
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </LandingRoundButton>
        </div>
      </div>
    </header>
  )
}
