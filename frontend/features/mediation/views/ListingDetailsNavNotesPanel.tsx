'use client'

import { MessageSquare, Send } from 'lucide-react'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import type { ListingDetailsNavViewProps } from './listingDetailsNavViewTypes'

export function ListingDetailsNavNotesPanel({
  navNotes,
  newNote,
  setNewNote,
  onAddNote,
  t,
}: Pick<ListingDetailsNavViewProps, 'navNotes' | 'newNote' | 'setNewNote' | 'onAddNote' | 't'>) {
  return (
            <section
              className="card"
              style={{
                padding: 'var(--space-6)',
                border: '1px solid var(--color-sky-blue)',
                background: 'rgba(59, 130, 246, 0.03)',
              }}
            >
              <h3
                style={{
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />{' '}
                {t('noteForCaseworker')}
              </h3>
              <form onSubmit={onAddNote} style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="input"
                    placeholder={t('addInternalNotePlaceholder')}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={{
                      minHeight: '100px',
                      paddingRight: 'var(--space-10)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-on-dark)',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p
                  className="text-sm"
                  style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}
                >
                  {t('onlyVisibleCaseworker')}
                </p>
              </form>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {navNotes.length > 0 ? (
                  navNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: 'var(--space-4)',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        borderLeft: '4px solid var(--color-accent)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-body)' }}>
                        {note.note_text}
                      </p>
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatDateTimeNo(note.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    {t('noNotesYet')}
                  </p>
                )}
              </div>
            </section>
  )
}
