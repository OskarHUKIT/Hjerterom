'use client'

import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

type OpsMobileSearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onSubmit?: () => void
  trailing?: ReactNode
  id?: string
}

export default function OpsMobileSearchBar({
  value,
  onChange,
  placeholder,
  onSubmit,
  trailing,
  id,
}: OpsMobileSearchBarProps) {
  return (
    <div className="ops-mobile-search-row">
      <label className="ops-mobile-search" htmlFor={id}>
        <Search size={16} aria-hidden className="ops-mobile-search-icon" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="ops-mobile-search-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit?.()
          }}
        />
      </label>
      {trailing}
    </div>
  )
}
