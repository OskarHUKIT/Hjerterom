'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function FinnTermsPageClient() {
  const { t } = useLanguage()

  return (
    <article className="finn-legal card">
      <h1>{t('finnLegalTitle')}</h1>
      <p className="finn-legal-lead">{t('finnLegalLead')}</p>
      <section>
        <h2>{t('finnLegalSection1Title')}</h2>
        <p>{t('finnLegalSection1Body')}</p>
      </section>
      <section>
        <h2>{t('finnLegalSection2Title')}</h2>
        <p>
          {t('finnLegalSection2Body')}{' '}
          <Link href="/finn/mine">{t('finnNavMine')}</Link>
        </p>
      </section>
      <section>
        <h2>{t('finnLegalSection3Title')}</h2>
        <p>
          {t('finnLegalSection3Body')}{' '}
          <a href="mailto:info@hjerterum.no">info@hjerterum.no</a>.
        </p>
      </section>
      <p>
        <Link href="/finn">{t('finnLegalBackLink')}</Link>
      </p>
    </article>
  )
}
