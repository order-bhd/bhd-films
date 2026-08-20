import { useState } from 'react'
import { Paperclip, ExternalLink, Loader2 } from 'lucide-react'
import { getSupportAttachmentUrl } from '../../utils/supportAttachments'

// Renders a small "View Attachment" chip that lazily generates a signed
// URL (the bucket is private) only when the viewer actually clicks it.
export default function AttachmentPreview({ path }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!path) return null

  async function open() {
    setError('')
    setLoading(true)
    try {
      const url = await getSupportAttachmentUrl(path)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e.message || 'Could not open attachment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--gold, #d4af37)',
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: 8,
          padding: '5px 10px',
          cursor: loading ? 'wait' : 'pointer'
        }}
      >
        {loading ? <Loader2 size={13} className="spin" /> : <Paperclip size={13} />}
        View Attachment
        {!loading && <ExternalLink size={11} />}
      </button>
      {error && <div className="field-error" style={{ marginTop: 4, fontSize: 11 }}>{error}</div>}
    </div>
  )
}
