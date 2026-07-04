'use client'

import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import { useSignTermsIdentityGate } from '@/features/auth/hooks/useSignTermsIdentityGate'

type SignTermsLinkProps = {
  href: string
  className?: string
  style?: CSSProperties
  children: ReactNode
  onNavigate?: () => void
}

/** Landlord link to sign-terms — opens identity verification dialog before navigation. */
export default function SignTermsLink({
  href,
  className,
  style,
  children,
  onNavigate,
}: SignTermsLinkProps) {
  const { requestSignTerms, SignTermsIdentityDialog } = useSignTermsIdentityGate()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onNavigate?.()
    requestSignTerms(href)
  }

  return (
    <>
      <a href={href} className={className} style={style} onClick={handleClick}>
        {children}
      </a>
      <SignTermsIdentityDialog />
    </>
  )
}
