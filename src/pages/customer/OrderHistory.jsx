import { useEffect, useState } from 'react'
import { ReceiptText, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import { formatCurrency, formatDate } from '../../utils/format'

const STATUS_CHIP = {
  received: 'chip-info',
  processing: 'chip-warning',
  completed: 'chip-success',
  cancelled: 'chip-danger',
  refunded: 'chip-gold'
}

export default function OrderHistory() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!mounted) return
      setOrders(data || [])
      setLoading(false)
    }
    if (user) load()
    return () => {
      mounted = false
    }
  }, [user])

  if (loading) return <Loader />

  return (
    <div className="page-pad">
      <h1 style={{ fontSize: 18, margin: '4px 0 16px' }}>Order History</h1>

      {orders.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No orders yet" subtitle="Your placed orders will show up here." />
      ) : (
        orders.map((order) => {
          const open = expanded === order.id
          return (
            <div key={order.id} className="surface-card" style={{ marginBottom: 10 }}>
              <div className="row-between" style={{ cursor: 'pointer' }} onClick={() => setExpanded(open ? null : order.id)}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5 }}>{order.order_code}</div>
                  <div className="text-faint" style={{ fontSize: 11 }}>
                    {order.category_name_snapshot} · {formatDate(order.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`chip ${STATUS_CHIP[order.status] || 'chip-info'}`}>{order.status}</span>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {open && (
                <>
                  <div className="divider" />
                  {(order.order_items || []).map((item) => (
                    <div key={item.id} style={{ marginBottom: 10 }}>
                      <div className="row-between" style={{ fontSize: 12.5 }}>
                        <span style={{ fontWeight: 700 }}>{item.service_name_snapshot}</span>
                        <span>{formatCurrency(item.item_total)}</span>
                      </div>
                      <div className="text-faint" style={{ fontSize: 11 }}>
                        Qty {item.quantity} × {formatCurrency(item.applied_rate)}
                      </div>
                      {item.target_link && (
                        <div className="text-faint" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                          {item.target_link}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="divider" />
                  <div className="row-between" style={{ fontWeight: 800 }}>
                    <span>Grand Total</span>
                    <span className="text-gold">{formatCurrency(order.grand_total)}</span>
                  </div>
                  {order.estimated_time_text && (
                    <p className="text-faint" style={{ fontSize: 11, marginTop: 8 }}>
                      Estimated processing time: approximately {order.estimated_time_text}.
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
