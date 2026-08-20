import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Reusable "📣 Notify Customers" action for admin pages (Offers, Rate
// Control...). Calls the send-push Edge Function, which re-checks that the
// caller is really an admin before sending anything - this button is a
// convenience, not the security boundary.
export default function NotifyCustomersButton({ title, body, url = '/', label = 'Notify Customers' }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleClick() {
    setSending(true)
    setError('')
    setResult(null)
    const { data, error: fnError } = await supabase.functions.invoke('send-push', {
      body: { title, body, url, audience: 'all' }
    })
    setSending(false)
    if (fnError) {
      setError(fnError.message || 'Could not send notifications.')
      return
    }
    setResult(data)
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={handleClick} disabled={sending}>
        <BellRing size={14} /> {sending ? 'Sending…' : label}
      </button>
      {result && (
        <p className="text-faint" style={{ fontSize: 10.5, marginTop: 4 }}>
          Sent to {result.sent} device{result.sent === 1 ? '' : 's'}
          {result.removed ? ` · ${result.removed} expired removed` : ''}
        </p>
      )}
      {error && <p className="field-error" style={{ fontSize: 10.5, marginTop: 4 }}>{error}</p>}
    </div>
  )
}
