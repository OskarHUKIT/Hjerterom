'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function TestDB() {
  const [status, setStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [message, setMessage] = useState('Kobler til Supabase...')
  const [details, setDetails] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to fetch one row from listings table to test connection
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .limit(1)

        if (error) {
          setStatus('error')
          setMessage('Feil ved tilkobling til Supabase')
          setDetails(error.message)
          console.error('Supabase error:', error)
        } else {
          setStatus('success')
          setMessage('Tilkobling vellykket!')
          setDetails(`Hentet ${data?.length || 0} rader fra 'listings' tabellen.`)
        }
      } catch (err: any) {
        setStatus('error')
        setMessage('En uventet feil oppsto')
        setDetails(err.message)
        console.error('Unexpected error:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <main className="container" style={{ padding: 'var(--space-10) var(--space-4)' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 'var(--space-4)' }}>Database Test</h1>
        
        <div style={{ 
          padding: 'var(--space-6)', 
          borderRadius: '12px', 
          background: status === 'success' ? 'rgba(45, 212, 191, 0.1)' : status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${status === 'success' ? 'var(--color-teal)' : status === 'error' ? '#ef4444' : 'var(--color-royal-blue)'}`,
          marginBottom: 'var(--space-6)'
        }}>
          <h2 style={{ color: status === 'success' ? 'var(--color-teal)' : status === 'error' ? '#ef4444' : 'inherit' }}>
            {message}
          </h2>
          {details && <p style={{ marginTop: 'var(--space-2)', fontSize: '0.9rem' }}>{details}</p>}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          <Link href="/" className="button" style={{ background: 'var(--color-dark-navy)' }}>
            Tilbake til forsiden
          </Link>
          <button 
            onClick={() => window.location.reload()} 
            className="button"
          >
            Test på nytt
          </button>
        </div>

        {status === 'error' && (
          <div style={{ marginTop: 'var(--space-6)', textAlign: 'left', fontSize: '0.85rem', opacity: 0.8 }}>
            <h4 style={{ marginBottom: 'var(--space-2)' }}>Feilsøkingstips:</h4>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Sjekk at <code>.env.local</code> i frontend-mappen har riktige nøkler.</li>
              <li>Sjekk at du har kjørt SQL-skriptet fra <code>SUPABASE_SETUP.md</code> i Supabase SQL Editor.</li>
              <li>Sjekk at Supabase-prosjektet ditt er aktivt.</li>
              <li>Sjekk konsollen i nettleseren for mer detaljerte feilmeldinger.</li>
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}


