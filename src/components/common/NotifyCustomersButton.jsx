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
    if (sending) return

    setSending(true)
    setError('')
    setResult(null)

    try {
      // Get current logged-in admin session
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError(
          'Your login session has expired. Please login again.'
        )
        setSending(false)
        return
      }

      console.log(
        'Sending notification as authenticated admin'
      )

      const {
        data,
        error: fnError
      } = await supabase.functions.invoke(
        'send-push',
        {
          headers: {
            Authorization:
              `Bearer ${session.access_token}`
          },
          body: {
            title,
            body,
            url,
            audience: 'all'
          }
        }
      )

      if (fnError) {
        console.error(
          'Function error:',
          fnError
        )

        let message =
          fnError.message ||
          'Could not send notifications.'

        // Try to show the real error returned
        // by the Edge Function
        if (fnError.context) {
          try {
            const errorData =
              await fnError.context.json()

            console.error(
              'Function response:',
              errorData
            )

            message =
              errorData.error ||
              errorData.details ||
              message
          } catch {
            // Keep original message
          }
        }

        setError(message)
        return
      }

      console.log(
        'Notification result:',
        data
      )

      setResult(data)
    } catch (err) {
      console.error(err)

      setError(
        err.message ||
        'Could not send notifications.'
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

        {sending
          ? 'Sending…'
          : label}
      </button>

      {result && (
        <p
          className="text-faint"
          style={{
            fontSize: 10.5,
            marginTop: 4
          }}
        >
          Sent to {result.sent} device
          {result.sent === 1 ? '' : 's'}

          {result.failed > 0
            ? ` · ${result.failed} failed`
            : ''}

          {result.removed > 0
            ? ` · ${result.removed} expired removed`
            : ''}
        </p>
      )}

      {error && (
        <p
          className="field-error"
          style={{
            fontSize: 10.5,
            marginTop: 4
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}