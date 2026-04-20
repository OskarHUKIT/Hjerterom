'use client'

/**
 * Vises øverst på juridiske sider og i signeringsscroll – tydeliggjør at tekstene ikke er endelige.
 *
 * Feature-flagg: skjules automatisk når NEXT_PUBLIC_LAUNCH_MODE === 'prod', så endelige vilkår
 * ikke blir merket som «utkast» etter lansering. Standard i dev/staging er at banneret vises.
 */
export function PreliminaryLegalDisclaimer() {
  if (process.env.NEXT_PUBLIC_LAUNCH_MODE === 'prod') return null

  return (
    <div
      role="note"
      style={{
        marginBottom: 'var(--space-6)',
        padding: 'var(--space-4)',
        background:
          'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '12px',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        lineHeight: 1.55,
      }}
    >
      <strong
        style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-main)' }}
      >
        Preliminært utkast
      </strong>
      <span style={{ color: 'var(--text-body)' }}>
        Teksten under er et arbeidsdokument og erstatter ikke juridisk vurdering. Den skal
        kvalitetssikres mot norsk lov (blant annet avtalerett, personopplysningsloven og
        forvaltningsrett der det er relevant) før den fastsettes som endelige vilkår og
        personvernerklæring.
      </span>
    </div>
  )
}
