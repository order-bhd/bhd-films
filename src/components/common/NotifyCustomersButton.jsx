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
      // Get the currently logged-in user's session
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError) {
        throw new Error(sessionError.message)
      }

      if (!session?.access_token) {
        throw new Error(
          'Your admin session has expired. Please logout and login again.'
        )
      }

      // Explicitly send the user's JWT to the Edge Function
      const { data, error: fnError } =
        await supabase.functions.invoke('send-push', {
          body: {
            title,
            body,
            url,
            audience: 'all'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

      if (fnError) {
        console.error('Push function error:', fnError)
        throw new Error(
          fnError.message || 'Could not send notifications.'
        )
      }

      setResult(data)
    } catch (err) {
      console.error('Notification error:', err)
      setError(
        err?.message || 'Could not send notifications.'
      )
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
        <p
          className="text-faint"
          style={{ fontSize: 10.5, marginTop: 4 }}
        >
          Sent to {result.sent} device
          {result.sent === 1 ? '' : 's'}

          {result.removed > 0 &&
            ` · ${result.removed} expired removed`}

          {result.failed > 0 &&
            ` · ${result.failed} failed`}
        </p>
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