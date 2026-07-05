'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import ShellChromeControls from '../design-system/ShellChromeControls'
import Logo from '../Logo'
import { buttonClassName } from '../ui/Button'

export default function LandingHeader() {
  const { t } = useLanguage()

  return (
    <header className="landing-header hrt-glass-header">
      <div className="landing-header__inner">
        <Link prefetch={false} href="/" className="landing-header__brand" aria-label={t('goHome')}>
          <Logo />
        </Link>

        <div className="landing-header__actions">
          <Link
            prefetch={false}
            href="/login"
            className={buttonClassName('gradient', 'landing-header__login')}
          >
            {t('logIn')}
            <ArrowRight size={14} aria-hidden />
          </Link>
          <ShellChromeControls compact />
        </div>
      </div>
    </header>
  )
}
