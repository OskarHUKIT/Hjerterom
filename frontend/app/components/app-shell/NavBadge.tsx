'use client'

type NavBadgeProps = {
  count: number
  className?: string
}

/** Unread indicator for app shell nav items (NPD-5 #6). */
export default function NavBadge({ count, className }: NavBadgeProps) {
  if (count <= 0) return null
  return (
    <span className={`app-shell-nav-badge${className ? ` ${className}` : ''}`} aria-hidden>
      {count > 99 ? '99+' : count}
    </span>
  )
}
