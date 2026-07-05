'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import AccordionWithChevron, {
  type AccordionChevronItem,
} from '@/app/components/design-system/AccordionWithChevron'
import { useLanguage } from '@/context/LanguageContext'
import type { RegisterPropertySectionId } from '@/features/listings/components/register/registerPropertySections'

export type RegisterPropertySection = {
  id: RegisterPropertySectionId
  title: string
  icon: ReactNode
  content: ReactNode
  isComplete?: boolean
}

type Props = {
  sections: RegisterPropertySection[]
  /** When set, opens the matching accordion panel on mobile (e.g. after validation). */
  focusSectionId?: RegisterPropertySectionId | null
  onFocusHandled?: () => void
}

function useRegisterMobileLayout() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}

export default function RegisterPropertyStepLayout({
  sections,
  focusSectionId,
  onFocusHandled,
}: Props) {
  const { t } = useLanguage()
  const isMobile = useRegisterMobileLayout()
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null)

  useEffect(() => {
    if (!focusSectionId) return
    setOpenId(focusSectionId)
    onFocusHandled?.()
  }, [focusSectionId, onFocusHandled])

  const accordionItems = useMemo<AccordionChevronItem[]>(
    () =>
      sections.map((section) => ({
        id: section.id,
        domId: `register-section-${section.id}`,
        title: section.title,
        icon: section.icon,
        content: section.content,
        isComplete: section.isComplete,
      })),
    [sections]
  )

  if (isMobile) {
    return (
      <div className="register-property-accordion">
        <AccordionWithChevron
          items={accordionItems}
          openId={openId}
          onOpenChange={setOpenId}
          ariaLabel={t('registerPropertyAccordionAria')}
          getExpandLabel={(title) => t('accordionExpandSection').replace('{title}', title)}
          getCollapseLabel={(title) => t('accordionCollapseSection').replace('{title}', title)}
        />
      </div>
    )
  }

  const [contact, details, price] = sections

  return (
    <div className="register-form-columns">
      <div className="register-form-main-col">
        {[contact, details].map((section) => (
          <section key={section.id} className="form-section">
            <h3 className="form-section-heading">
              {section.icon} {section.title}
            </h3>
            {section.content}
          </section>
        ))}
      </div>
      <div className="register-form-sidebar">
        <section className="form-section">
          <h3 className="form-section-heading">
            {price.icon} {price.title}
          </h3>
          {price.content}
        </section>
      </div>
    </div>
  )
}
