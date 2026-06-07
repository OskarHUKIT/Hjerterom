'use client'

import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

export default function OpsGdprBanner() {
  const { t } = useLanguage()
  return (
    <aside className="ops-gdpr-banner" role="note" aria-label={t('opsGdprNotice')}>
      <AlertTriangle size={18} aria-hidden />
      <p className="ops-gdpr-banner-text">{t('opsGdprNotice')}</p>
    </aside>
  )
}
