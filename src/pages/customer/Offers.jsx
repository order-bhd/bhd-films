import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PromoBanner from '../../components/common/GradientBanner'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'

export default function Offers() {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState([])

  useEffect(() => {
    let mounted = true
    supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (!mounted) return
        setOffers(data || [])
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <Loader />

  return (
    <div className="page-pad">
      <h1 style={{ fontSize: 18, margin: '4px 0 16px' }}>Offers</h1>
      {offers.length === 0 ? (
        <EmptyState icon={Gift} title="No offers right now" subtitle="Check back soon for new deals." />
      ) : (
        offers.map((o) => (
          <div key={o.id} style={{ marginBottom: 12 }}>
            <PromoBanner title={o.title} description={o.description} icon={o.icon} gradient={o.gradient} />
          </div>
        ))
      )}
    </div>
  )
}
