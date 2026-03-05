'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Bell, CheckCircle2, Clock, MessageSquare, ShieldCheck, 
  FileText, User, Trash2, Info, AlertTriangle, Send, Home
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTimeNo } from '../../lib/dateFormat'
import PushPermissionCard from '../../components/PushPermissionCard'
import { useLanguage } from '../../../context/LanguageContext'

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function NavNotifications(props: PageProps) {
  use(props.searchParams ?? Promise.resolve({}))
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchNotifications = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)
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
    const { data: { user } } = await supabase.auth.getUser()
    const resolverId = newStatus === 'completed' ? user?.id ?? 'me' : null
    setNotifications(notifs =>
      notifs.map(n => n.id === id ? { ...n, status: newStatus, resolved_by: resolverId, resolved_at: newStatus === 'completed' ? new Date().toISOString() : null } : n)
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
      case 'HANDOVER_REMINDER': return <AlertTriangle size={18} />
      default: return <Bell size={18} />
    }
  }

  return (
    <main className="container">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Link href="/" className="nav-link" style={{ marginLeft: '-1rem', marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ← {t('overview')}
        </Link>
        <h1 style={{ fontSize: '2.75rem' }}>{t('notifications')}</h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.8 }}>
          {role === 'kommune_ansatt' ? t('notificationsSharedDesc') : t('notificationsUserDesc')}
        </p>
      </div>

      <PushPermissionCard />

      {loading ? (
        <div className="card" style={{ padding: 'var(--space-10)', minHeight: '200px' }} />
      ) : notifications.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {notifications.map(notif => {
            const isFormidletNotif = (notif.type === 'HOUSE_FORMIDLET' || notif.type === 'HANDOVER_REMINDER') && notif.listing_id
            const messageLink = notif.type === 'NEW_MESSAGE'
              ? (role === 'kommune_ansatt' && notif.related_user_id
                ? `/nav/messages?with=${notif.related_user_id}`
                : '/nav/messages')
              : !isFormidletNotif && (notif.type === 'NEW_REPORT' && notif.listing_id && role === 'kommune_ansatt')
                  ? `/listings/${notif.listing_id}?view=nav#overtakelsesrapport`
                  : null
            const cardContent = (
              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', 
                  background: notif.status === 'unread' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(32, 187, 175, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: notif.status === 'unread' ? 'var(--color-accent)' : 'var(--color-teal)'
                }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{notif.title}</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-body)' }}>{notif.message}</p>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDateTimeNo(notif.created_at)}
                    </span>
                    {notif.resolved_by && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        {(role === 'kommune_ansatt' && notif.resolved_by !== currentUserId) ? t('resolvedByColleague') : t('resolvedByYou')}
                      </span>
                    )}
                    {messageLink && !isFormidletNotif && (
                      <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                        → {notif.type === 'NEW_REPORT' ? t('viewReport') : t('goToMessage')}
                      </span>
                    )}
                  </div>
                  {isFormidletNotif && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                      <Link href={`/listings/${notif.listing_id}?view=owner#kontaktinfo`} className="button" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                        <FileText size={14} /> {t('contactInfoForm')}
                      </Link>
                      <Link href={`/report/utleier/${notif.listing_id}`} className="button" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', background: 'var(--color-teal)', color: 'white', border: 'none' }}>
                        <FileText size={14} /> {t('fillHandoverReport')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
            return (
              <div 
                key={notif.id} 
                className={`card notif-card ${notif.status}`} 
                style={{ 
                  padding: 'var(--space-6)', 
                  opacity: notif.status === 'completed' ? 0.88 : 1,
                  borderLeft: `4px solid ${notif.status === 'unread' ? 'var(--color-accent)' : 'var(--color-teal)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {messageLink && !isFormidletNotif ? (
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
                        {t('markDone')}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusChange(notif.id, 'unread')}
                        className="button" 
                        style={{ padding: '8px 16px', background: 'var(--bg-card)', border: '1px solid var(--border-medium)', color: 'var(--text-main)', fontWeight: 500 }}
                      >
                        {t('markUnread')}
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
          <p>{t('noNotifications')}</p>
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
