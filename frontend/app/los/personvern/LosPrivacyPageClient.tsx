'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function LosPrivacyPageClient() {
  const { t } = useLanguage()

  return (
    <article className="finn-legal card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>{t('losLegalTitle')}</h1>
      <p className="finn-legal-lead">{t('losLegalLead')}</p>
      <section>
        <h2>{t('losLegalStoreTitle')}</h2>
        <ul>
          <li>{t('losLegalStoreItem1')}</li>
          <li>{t('losLegalStoreItem2')}</li>
          <li>{t('losLegalStoreItem3')}</li>
        </ul>
      </section>
      <section>
        <h2>{t('losLegalConsentTitle')}</h2>
        <p>{t('losLegalConsentBody')}</p>
      </section>
      <section>
        <h2>{t('losLegalRetentionTitle')}</h2>
        <p>{t('losLegalRetentionBody')}</p>
      </section>
      <section>
        <h2>{t('losLegalContactTitle')}</h2>
        <p>
          {t('losLegalContactBody')}{' '}
          <a href="mailto:info@hjerterum.no">info@hjerterum.no</a>.
        </p>
      </section>
      <p>
        <Link href="/los">{t('losLegalBackLink')}</Link>
      </p>
    </article>
  )
}
