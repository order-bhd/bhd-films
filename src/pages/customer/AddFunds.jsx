import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'

export default function AddFunds() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [selected, setSelected] = useState(null)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    supabase.from('payment_settings').select('*').eq('id', true).maybeSingle().then(({ data }) => setSettings(data))
  }, [])

  const presets = settings?.preset_amounts || [1, 100, 200, 300, 400, 500, 600, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000]

  function goToPay(amount) {
    if (!amount || amount <= 0) return
    navigate('/payment-qr', { state: { amount } })
  }

  return (
    <div className="page-pad">
      <h1 style={{ fontSize: 18, margin: '4px 0 6px' }}>Add Funds</h1>
      <p className="text-dim" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 18 }}>
        Select an amount, pay via QR, then upload your receipt for verification.
      </p>

      <div className="grid-3">
        {presets.map((amt) => (
          <button
            key={amt}
            className={`amount-chip${selected === amt ? ' selected' : ''}`}
            onClick={() => setSelected(amt)}
          >
            {formatCurrency(amt)}
          </button>
        ))}
      </div>

      {settings?.allow_custom_amount && (
        <div style={{ marginTop: 16 }}>
          <span className="field-label">Or enter a custom amount</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 750"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              setSelected(null)
            }}
          />
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ marginTop: 20 }}
        disabled={!selected && !(custom && Number(custom) > 0)}
        onClick={() => goToPay(selected || Number(custom))}
      >
        Continue · {formatCurrency(selected || Number(custom) || 0)}
      </button>
    </div>
  )
}
