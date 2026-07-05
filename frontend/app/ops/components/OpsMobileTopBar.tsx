'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { usePlatformMode } from '@/context/PlatformModeContext'
import type { Locale } from '@/lib/translations'
const ROOT_PATHS = ['/ops', '/ops/kommuner', '/ops/accounts', '/ops/broadcasts']
const LOCALES: Locale[] = ['no', 'se', 'en']

type OpsMobileTopBarProps = {
  title: string
  onOpenMenu: () => void
}

export default function OpsMobileTopBar({ title, onOpenMenu }: OpsMobileTopBarProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const { t, locale, setLocale } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { flags } = usePlatformMode()
  const [scrolled, setScrolled] = useState(false)

  const isRoot = ROOT_PATHS.includes(pathname)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  const modeLabel = flags.isHjerterumMode ? t('opsPlatformModeHjerterum') : t('opsPlatformModeBoly')

  return (
    <header className={`ops-mobile-topbar${scrolled ? ' ops-mobile-topbar--scrolled' : ''}`}>
      <button
        type="button"
        className="ops-icon-btn"
        aria-label={isRoot ? t('opsOpenMenu') : t('back')}
        onClick={() => {
          if (isRoot) onOpenMenu()
          else router.back()
        }}
      >
        {isRoot ? <Menu size={22} aria-hidden /> : <ArrowLeft size={22} aria-hidden />}
      </button>

      <div className="ops-mobile-topbar-title-wrap">
        <h1 className="ops-mobile-topbar-title">{title}</h1>
      </div>

      <Link href="/ops/platform" className="ops-mode-pill" aria-label={t('opsNavPlatform')}>
        <span className="ops-mode-pill-dot" aria-hidden />
        <span>{modeLabel.replace(/\s*\(.*\)/, '').split(' ')[0]}</span>
      </Link>

      <div className="ops-lang-group" role="group" aria-label={t('languageLabel')}>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            className="ops-lang-btn"
            aria-pressed={locale === code}
            onClick={() => setLocale(code)}
          >
            {code === 'no' ? 'NO' : code === 'se' ? 'SE' : 'EN'}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="ops-icon-btn"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
      >
        {theme === 'dark' ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
      </button>
    </header>
  )
}
