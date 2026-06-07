'use client'

import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

export default function OpsGdprBanner() {
  const { t } = useLanguage()
  return (
    <div className="ops-gdpr-banner" role="note">
      <AlertTriangle size={18} aria-hidden />
      <p>{t('opsGdprNotice')}</p>
    </div>
  )
}
