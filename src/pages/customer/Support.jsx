import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LifeBuoy, Plus, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import { formatDate } from '../../utils/format'
import { categoryLabel, statusMeta } from '../../utils/supportCategories'

// "My Support Tickets" - the customer only ever sees their own tickets
// (enforced by support_tickets_select RLS: user_id = auth.uid()).
export default function Support() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const instanceId = useId()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])

  async function load() {
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return undefined
    load()
    const channel = supabase
      .channel(`support-tickets-${user.id}-${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, instanceId])

  if (loading) return <Loader />

  return (
    <div className="page-pad">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, margin: '4px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LifeBuoy size={18} /> Support
        </h1>
      </div>
      <p className="text-dim" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 16 }}>
        View your support tickets or start a new one.
      </p>

      <button className="btn btn-primary" style={{ marginBottom: 18 }} onClick={() => navigate('/support/new')}>
        <Plus size={16} /> New Support Ticket
      </button>

      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No support tickets yet" subtitle="Need help? Start a new ticket above." />
      ) : (
        tickets.map((t) => {
          const s = statusMeta(t.status)
          return (
            <button
              key={t.id}
              onClick={() => navigate(`/support/${t.id}`)}
              className="surface-card"
              style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, position: 'relative', background: t.has_unread_admin_reply ? 'rgba(212,175,55,0.06)' : undefined }}
            >
              <div className="row-between">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 13.5 }}>{t.ticket_code}</span>
                    {t.has_unread_admin_reply && (
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--gold, #d4af37)', flexShrink: 0 }} title="New reply" />
                    )}
                  </div>
                  <div className="text-dim" style={{ fontSize: 12.5, marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject}
                  </div>
                  <div className="text-faint" style={{ fontSize: 11, marginTop: 4 }}>
                    {categoryLabel(t.category)} · {formatDate(t.last_message_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`chip ${s.chip}`}>{s.label}</span>
                  <ChevronRight size={16} className="text-faint" />
                </div>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
