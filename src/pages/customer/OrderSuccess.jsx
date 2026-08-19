import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

export default function OrderSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state

  if (!data) {
    navigate('/orders', { replace: true })
    return null
  }

  return (
    <div className="page-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80dvh', justifyContent: 'center', textAlign: 'center' }}>
      <CheckCircle2 size={56} color="var(--success)" />
      <h1 style={{ fontSize: 20, margin: '16px 0 4px' }}>Payment Successful</h1>
      <p className="text-dim" style={{ fontSize: 13, margin: 0 }}>Your order has been received.</p>

      <div className="surface-card" style={{ width: '100%', marginTop: 22, textAlign: 'left' }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span className="text-faint">Order ID</span>
          <span style={{ fontWeight: 800 }}>{data.order_code}</span>
        </div>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span className="text-faint">Amount Deducted</span>
          <span style={{ fontWeight: 700 }}>{formatCurrency(data.grand_total)}</span>
        </div>
        <div className="row-between">
          <span className="text-faint">Remaining Wallet Balance</span>
          <span className="text-gold" style={{ fontWeight: 700 }}>{formatCurrency(data.remaining_balance)}</span>
        </div>
        {data.estimated_time_text && (
          <>
            <div className="divider" />
            <p className="text-dim" style={{ fontSize: 12, margin: 0 }}>
              Estimated processing time: approximately {data.estimated_time_text}. This is an estimate, not a guarantee.
            </p>
          </>
        )}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/orders')}>
        View Order History
      </button>
      <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/')}>
        Back to Home
      </button>
    </div>
  )
}
