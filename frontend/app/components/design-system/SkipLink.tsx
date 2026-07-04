'use client'

import { useLanguage } from '@/context/LanguageContext'

export default function SkipLink() {
  const { t } = useLanguage()

  return (
    <a href="#main-content" className="skip-link">
      {t('skipToMain')}
    </a>
  )
}
