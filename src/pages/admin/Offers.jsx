import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import NotifyCustomersButton from '../../components/common/NotifyCustomersButton'
import { ICON_KEYS } from '../../utils/iconMap'

const EMPTY = { title: '', description: '', icon: 'gift', gradient: 'gold', valid_from: '', valid_until: '', is_active: true, display_order: 0 }
const GRADIENTS = ['gold', 'crimson', 'violet']

export default function AdminOffers() {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('offers').select('*').order('display_order')
    setOffers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setForm(EMPTY)
    setError('')
    setEditing({})
  }

  function openEdit(offer) {
    setForm({ ...offer, valid_from: offer.valid_from || '', valid_until: offer.valid_until || '' })
    setError('')
    setEditing(offer)
  }

  async function handleSave() {
    setError('')
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      icon: form.icon,
      gradient: form.gradient,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      is_active: !!form.is_active,
      display_order: Number(form.display_order) || 0
    }
    const query = editing?.id ? supabase.from('offers').update(payload).eq('id', editing.id) : supabase.from('offers').insert(payload)
    const { error: err } = await query
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setEditing(null)
    load()
  }

  async function toggleActive(offer) {
    await supabase.from('offers').update({ is_active: !offer.is_active }).eq('id', offer.id)
    load()
  }

  async function handleDelete(offer) {
    if (!window.confirm(`Delete offer "${offer.title}"?`)) return
    await supabase.from('offers').delete().eq('id', offer.id)
    load()
  }

  if (loading) return <Loader />

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 19, margin: 0 }}>Offers</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={15} /> Add Offer
        </button>
      </div>

      <div className="surface-card">
        {offers.length === 0 && <p className="text-faint" style={{ fontSize: 13 }}>No offers yet.</p>}
        {offers.map((o) => (
          <div key={o.id} style={{ borderBottom: '1px solid var(--border-soft)', padding: '12px 4px' }}>
            <div className="row-between">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.title}</div>
                <div className="text-faint" style={{ fontSize: 11 }}>
                  {o.valid_from || 'always'} → {o.valid_until || 'no expiry'}
                </div>
              </div>
              <span className={`chip ${o.is_active ? 'chip-success' : 'chip-danger'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(o)}>
                {o.is_active ? 'Active' : 'Inactive'}
              </span>
              <button className="icon-btn" onClick={() => openEdit(o)}>
                <Pencil size={14} />
              </button>
              <button className="icon-btn" onClick={() => handleDelete(o)}>
                <Trash2 size={14} />
              </button>
            </div>
            {o.is_active && (
              <div style={{ marginTop: 8 }}>
                <NotifyCustomersButton
                  title={`🎁 ${o.title}`}
                  body={o.description || 'Check out this new offer on BHD Films!'}
                  url="/offers"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {editing !== null && (
        <Modal title={editing?.id ? 'Edit Offer' : 'Add Offer'} onClose={() => setEditing(null)}>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Description</span>
            <textarea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div>
              <span className="field-label">Icon</span>
              <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                {ICON_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="field-label">Gradient</span>
              <select value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })}>
                {GRADIENTS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div>
              <span className="field-label">Valid From</span>
              <input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </div>
            <div>
              <span className="field-label">Valid Until</span>
              <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Display Order</span>
            <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <input type="checkbox" style={{ width: 18, height: 18 }} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          {error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Offer'}
          </button>
        </Modal>
      )}
    </div>
  )
}
