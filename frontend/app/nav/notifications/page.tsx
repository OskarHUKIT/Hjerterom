'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Bell, CheckCircle2, Clock, MessageSquare, ShieldCheck, 
  FileText, User, Trash2, Info, AlertTriangle, Send, Home
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PushPermissionCard from '../../components/PushPermissionCard'

export default function NavNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  const fetchNotifications = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setRole(profile?.role || 'homeowner')

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (err: any) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleStatusChange = async (id: string, newStatus: 'unread' | 'completed') => {
    const previous = notifications
    setNotifications(notifs =>
      notifs.map(n => n.id === id ? { ...n, status: newStatus, resolved_by: newStatus === 'completed' ? 'me' : null, resolved_at: newStatus === 'completed' ? new Date().toISOString() : null } : n)
    )
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: newStatus,
          resolved_by: newStatus === 'completed' ? user?.id : null,
          resolved_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id)
      
      if (error) throw error
    } catch (err: any) {
      setNotifications(previous)
      alert('Feil ved oppdatering av varsel: ' + err.message)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_MESSAGE': return <MessageSquare size={18} />
      case 'NEW_REPORT': return <FileText size={18} />
      case 'TERMS_SIGNED': return <ShieldCheck size={18} />
      case 'AGREEMENT_ENDED': return <AlertTriangle size={18} />
      case 'HOUSE_FORMIDLET': return <Home size={18} />
      default: return <Bell size={18} />
    }
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← Oversikt
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>Varsler</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>
          {role === 'kommune_ansatt' ? 'Delt varslingssystem for kommune-ansatte.' : 'Viktige oppdateringer om ditt leieforhold.'}
        </p>
      </div>

      <PushPermissionCard />

      {loading ? (
        <div className="card" style={{ padding: 'var(--space-10)', minHeight: '200px' }} />
      ) : notifications.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {notifications.map(notif => {
            const messageLink = notif.type === 'NEW_MESSAGE'
              ? (role === 'kommune_ansatt' && notif.related_user_id
                ? `/nav/messages?with=${notif.related_user_id}`
                : '/nav/messages')
              : null
            const cardContent = (
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  background: notif.status === 'unread' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(32, 187, 175, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: notif.status === 'unread' ? 'var(--color-sky-blue)' : 'var(--color-teal)'
                }}>
                  {getIcon(notif.type)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{notif.title}</h3>
                  <p style={{ margin: '4px 0 0', opacity: 0.8 }}>{notif.message}</p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '8px', fontSize: '0.8rem', opacity: 0.5 }}>
                    <span><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> {new Date(notif.created_at).toLocaleString('no-NO')}</span>
                    {notif.resolved_by && <span><CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Løst av kollega</span>}
                    {messageLink && <span style={{ color: 'var(--color-sky-blue)' }}>→ Gå til melding</span>}
                  </div>
                </div>
              </div>
            )
            return (
              <div 
                key={notif.id} 
                className={`card notif-card ${notif.status}`} 
                style={{ 
                  padding: 'var(--space-6)', 
                  opacity: notif.status === 'completed' ? 0.6 : 1,
                  borderLeft: `4px solid ${notif.status === 'unread' ? 'var(--color-sky-blue)' : 'var(--color-teal)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {messageLink ? (
                    <Link href={messageLink} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>{cardContent}</div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {notif.status === 'unread' ? (
                      <button 
                        onClick={() => handleStatusChange(notif.id, 'completed')}
                        className="button" 
                        style={{ padding: '8px 16px', background: 'var(--color-teal)', color: 'white' }}
                      >
                        Marker som ferdig
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusChange(notif.id, 'unread')}
                        className="button" 
                        style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white' }}
                      >
                        Marker som ulest
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <Info size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
          <p>Ingen aktive varsler for øyeblikket.</p>
        </div>
      )}

      <style jsx>{`
        .notif-card.unread {
          background: rgba(59, 130, 246, 0.02);
        }
        .notif-card.unread:hover {
          background: rgba(59, 130, 246, 0.05);
        }
      `}</style>
    </main>
  )
}
