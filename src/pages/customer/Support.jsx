import { useState } from 'react'
import { CheckCircle2, LifeBuoy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { isValidEmail } from '../../utils/validators'

export default function Support() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    name: profile?.full_name || '',
    email: profile?.email || '',
    subject: '',
    message: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (!isValidEmail(form.email)) {
      setError('Please enter a valid email address.')
      return
    }
    setSubmitting(true)
    const { error: err } = await supabase.from('support_messages').insert({
      user_id: user?.id || null,
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim()
    })
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="page-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '70dvh', justifyContent: 'center', textAlign: 'center' }}>
        <CheckCircle2 size={48} color="var(--success)" />
        <h2 style={{ fontSize: 16, margin: '14px 0 6px' }}>Message Sent</h2>
        <p className="text-dim" style={{ fontSize: 13 }}>Our team will get back to you soon.</p>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <h1 style={{ fontSize: 18, margin: '4px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <LifeBuoy size={18} /> Support
      </h1>
      <p className="text-dim" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 18 }}>
        Have a question or an issue? Send us a message.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <span className="field-label">Name</span>
          <input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <span className="field-label">Email</span>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <span className="field-label">Subject</span>
          <input value={form.subject} onChange={(e) => update('subject', e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <span className="field-label">Message</span>
          <textarea rows={5} value={form.message} onChange={(e) => update('message', e.target.value)} />
        </div>
        {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  )
}
