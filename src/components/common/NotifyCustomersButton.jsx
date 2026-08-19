import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function NotifyCustomersButton({
  title,
  body,
  url = '/',
  label = 'Notify Customers'
}) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleClick() {
    setSending(true)
    setError('')
    setResult(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'send-push',
        {
          body: {
            title,
            body,
            url,
            audience: 'all'
          }
        }
      )

      console.log('Push notification response:', data)
      console.log('Push notification error:', fnError)

      if (fnError) {
        setError(fnError.message || 'Could not send notifications.')
        return
      }

      if (!data) {
        setError('No response received from the notification server.')
        return
      }

      setResult(data)
    } catch (err) {
      console.error('Notification error:', err)
      setError(err?.message || 'Could not send notifications.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={handleClick}
        disabled={sending}
      >
        <BellRing size={14} />
        {sending ? 'Sending…' : label}
      </button>

      {result && (
        <div
          className="text-faint"
          style={{ fontSize: 10.5, marginTop: 4 }}
        >
          <p>
            Sent: {result.sent || 0}
            {' · '}
            Failed: {result.failed || 0}
            {' · '}
            Total devices: {result.total || 0}
          </p>

          {result.removed > 0 && (
            <p>{result.removed} expired subscription(s) removed</p>
          )}
        </div>
      )}

      {error && (
        <p
          className="field-error"
          style={{ fontSize: 10.5, marginTop: 4 }}
        >
          {error}
        </p>
      )}
    </div>
  )
}