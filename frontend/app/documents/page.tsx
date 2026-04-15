'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { contactFormStorageFileName, publicDocumentsFileUrl } from '../lib/storagePublicUrl'

export default function Documents() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <main className="container">
      <div className="page-hero">
        <Link href="/" className="nav-link page-hero-back">
          ← Tilbake til forsiden
        </Link>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '0.5rem',
          }}
        >
          Dokumentadministrasjon
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-body)' }}>
          Last opp og administrer dokumenter
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Last opp dokument</h2>
        <div className="doc-upload-zone">
          <input
            id="documents-public-upload"
            name="documents_public_upload"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="doc-upload-input"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div className="doc-upload-inner">
            <Upload
              size={32}
              style={{
                color: 'var(--color-royal-blue)',
                opacity: 0.8,
                marginBottom: 'var(--space-2)',
              }}
            />
            <p
              style={{
                margin: '0 0 var(--space-2)',
                fontSize: '0.95rem',
                color: 'var(--text-body)',
              }}
            >
              {fileName ? (
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{fileName}</span>
              ) : (
                'Ingen fil valgt'
              )}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="button"
              style={{ padding: 'var(--space-2) var(--space-4)', fontSize: '0.9rem' }}
            >
              Velg fil
            </button>
          </div>
          <button
            type="button"
            className="button doc-upload-submit"
            style={{ marginTop: 'var(--space-4)' }}
          >
            <Upload size={18} style={{ marginRight: '8px' }} /> Last opp dokument
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>
          Eksisterende dokumenter
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              name: 'Vilkårsavtale Boly',
              file: 'VilkarsavtaleBoligbanken.pdf',
              desc: 'Vilkårsavtale for Boly',
            },
            {
              name: 'Overtakelsesrapport',
              file: 'Overtakelsesrapport.pdf',
              desc: 'Mal for overtakelsesrapport',
            },
            {
              name: 'Kontaktinfoskjema',
              file: contactFormStorageFileName(),
              desc: 'Skjema for kontaktinfo',
            },
          ].map((doc) => {
            const url = publicDocumentsFileUrl(doc.file)
            return (
              <a
                key={doc.file}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-list-link"
              >
                <div style={{ fontSize: '1.5rem', opacity: 0.9 }}>📄</div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}
                  >
                    {doc.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-body)' }}>
                    {doc.desc} · PDF
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </main>
  )
}
