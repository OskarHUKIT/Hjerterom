'use client'

import { useLanguage } from '@/context/LanguageContext'

export default function SkipLink() {
  const { t } = useLanguage()

  return (
    <a href="#main-content" className="hrt-skip-link">
      {t('skipToMain')}
    </a>
  )
}
