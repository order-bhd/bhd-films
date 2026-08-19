import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Loader from '../../components/common/Loader'
import { formatDate } from '../../utils/format'

export default function AuditLog() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300)
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const actions = ['all', ...new Set(logs.map((l) => l.action))]
  const visible = actionFilter === 'all' ? logs : logs.filter((l) => l.action === actionFilter)

  if (loading) return <Loader />

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 19, margin: 0 }}>Audit Log</h1>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ width: 'auto' }}>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="surface-card">
        {visible.length === 0 && <p className="text-faint" style={{ fontSize: 13 }}>No audit entries.</p>}
        {visible.map((log) => (
          <div key={log.id} style={{ borderBottom: '1px solid var(--border-soft)', padding: '10px 4px' }}>
            <div className="row-between">
              <span className="chip chip-info">{log.action}</span>
              <span className="text-faint" style={{ fontSize: 11 }}>{formatDate(log.created_at)}</span>
            </div>
            <p className="text-dim" style={{ fontSize: 12, margin: '6px 0 2px' }}>
              {log.entity_type} {log.entity_id ? `· ${log.entity_id}` : ''} {log.admin_email ? `· by ${log.admin_email}` : ''}
            </p>
            {log.remark && <p className="text-faint" style={{ fontSize: 11.5, margin: 0 }}>Remark: {log.remark}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
