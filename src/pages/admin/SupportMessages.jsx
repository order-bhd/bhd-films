import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/format'

const STATUSES = ['open', 'responded', 'closed']

export default function SupportMessages() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [statusFilter, setStatusFilter] = useState('open')
  const [editing, setEditing] = useState(null)
  const [remark, setRemark] = useState('')
  const [status, setStatus] = useState('responded')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('support_messages').select('*').order('created_at', { ascending: false })
    setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openReply(msg) {
    setEditing(msg)
    setRemark(msg.admin_remark || '')
    setStatus(msg.status === 'open' ? 'responded' : msg.status)
  }

  async function submitReply() {
    setBusy(true)
    await supabase.rpc('admin_update_support_message', {
      p_message_id: editing.id,
      p_status: status,
      p_remark: remark
    })
    setBusy(false)
    setEditing(null)
    load()
  }

  const visible = statusFilter === 'all' ? messages : messages.filter((m) => m.status === statusFilter)

  if (loading) return <Loader />

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 19, margin: 0 }}>Support Messages</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="surface-card">
        {visible.length === 0 && <p className="text-faint" style={{ fontSize: 13 }}>No messages.</p>}
        {visible.map((m) => (
          <div key={m.id} style={{ borderBottom: '1px solid var(--border-soft)', padding: '12px 4px', cursor: 'pointer' }} onClick={() => openReply(m)}>
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.subject}</div>
                <div className="text-faint" style={{ fontSize: 11 }}>{m.name} · {m.email} · {formatDate(m.created_at)}</div>
              </div>
              <span className={`chip ${m.status === 'open' ? 'chip-warning' : m.status === 'responded' ? 'chip-info' : 'chip-success'}`}>{m.status}</span>
            </div>
            <p className="text-dim" style={{ fontSize: 12, marginTop: 6 }}>{m.message}</p>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.subject} onClose={() => setEditing(null)}>
          <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 10 }}>{editing.message}</p>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Remark / Reply</span>
            <textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={submitReply} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </Modal>
      )}
    </div>
  )
}
