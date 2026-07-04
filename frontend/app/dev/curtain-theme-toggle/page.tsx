'use client'

import { CurtainThemeToggle } from '@/app/components/ui/curtain-theme-toggle'

export default function CurtainThemeToggleDemoPage() {
  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-12"
      style={{ color: 'var(--text-main)' }}
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
        Curtain theme toggle
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Click the button to see the curtain animation.
      </p>

      <div
        className="rounded-2xl border p-4 shadow-xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <CurtainThemeToggle variant="icon" duration={600} />
      </div>

      <div className="mt-6 w-full max-w-xs">
        <CurtainThemeToggle variant="chrome" compact />
      </div>
    </main>
  )
}
