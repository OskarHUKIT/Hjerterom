'use client'

/** Vises øverst på juridiske sider og i signeringsscroll – tydeliggjør at tekstene ikke er endelige. */
export function PreliminaryLegalDisclaimer() {
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
        color: '#92400e',
        fontSize: '0.95rem',
        lineHeight: 1.55,
      }}
    >
      <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Preliminært utkast</strong>
      Teksten under er et arbeidsdokument og erstatter ikke juridisk vurdering. Den skal
      kvalitetssikres mot norsk lov (blant annet avtalerett, personopplysningsloven og
      forvaltningsrett der det er relevant) før den fastsettes som endelige vilkår og
      personvernerklæring.
    </div>
  )
}
