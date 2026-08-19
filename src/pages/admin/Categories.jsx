import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import { ICON_KEYS, getIcon } from '../../utils/iconMap'

const EMPTY = { name: '', slug: '', icon: 'globe', description: '', display_order: 0, is_active: true }

export default function Categories() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {...} = edit
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('display_order')
    setCategories(data || [])
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

  function openEdit(cat) {
    setForm(cat)
    setError('')
    setEditing(cat)
  }

  function slugify(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSave() {
    setError('')
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: form.slug?.trim() || slugify(form.name),
      icon: form.icon,
      description: form.description || null,
      display_order: Number(form.display_order) || 0,
      is_active: !!form.is_active
    }
    const query = editing?.id
      ? supabase.from('categories').update(payload).eq('id', editing.id)
      : supabase.from('categories').insert(payload)
    const { error: err } = await query
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setEditing(null)
    load()
  }

  async function toggleActive(cat) {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    load()
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? This only works if it has no services.`)) return
    const { error: err } = await supabase.from('categories').delete().eq('id', cat.id)
    if (err) {
      window.alert(err.message)
      return
    }
    load()
  }

  if (loading) return <Loader />

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 19, margin: 0 }}>Categories</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="surface-card">
        {categories.length === 0 && <p className="text-faint" style={{ fontSize: 13 }}>No categories yet. Add your first one.</p>}
        {categories.map((cat) => {
          const Icon = getIcon(cat.icon)
          return (
            <div key={cat.id} className="list-row">
              <GripVertical size={14} className="text-faint" />
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{cat.name}</div>
                <div className="text-faint" style={{ fontSize: 11 }}>/{cat.slug} · order {cat.display_order}</div>
              </div>
              <span className={`chip ${cat.is_active ? 'chip-success' : 'chip-danger'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(cat)}>
                {cat.is_active ? 'Active' : 'Inactive'}
              </span>
              <button className="icon-btn" onClick={() => openEdit(cat)}>
                <Pencil size={14} />
              </button>
              <button className="icon-btn" onClick={() => handleDelete(cat)}>
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {editing !== null && (
        <Modal title={editing?.id ? 'Edit Category' : 'Add Category'} onClose={() => setEditing(null)}>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Slug (URL-friendly, auto if left blank)</span>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. instagram" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Icon</span>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="field-label">Description</span>
            <textarea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
            {saving ? 'Saving…' : 'Save Category'}
          </button>
        </Modal>
      )}
    </div>
  )
}
