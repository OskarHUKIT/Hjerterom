'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'

type OpsFabProps = {
  href?: string
  onClick?: () => void
  label: string
}

export default function OpsFab({ href, onClick, label }: OpsFabProps) {
  const className = 'ops-fab'
  const content = <Plus size={24} strokeWidth={2.4} aria-hidden />

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {content}
    </button>
  )
}
