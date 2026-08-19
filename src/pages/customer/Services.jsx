import { useEffect, useState } from 'react'
import { Search, LayoutGrid } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import CategoryCard from '../../components/services/CategoryCard'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'

export default function Services() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [tiers, setTiers] = useState([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data: cats } = await supabase.from('categories').select('*').eq('is_active', true).order('display_order')
      const { data: svcs } = await supabase.from('services').select('*').eq('is_active', true)
      let tierRows = []
      if (svcs && svcs.length > 0) {
        const { data } = await supabase
          .from('service_price_tiers')
          .select('*')
          .eq('is_active', true)
          .in('service_id', svcs.map((s) => s.id))
        tierRows = data || []
      }
      if (!mounted) return
      setCategories(cats || [])
      setServices(svcs || [])
      setTiers(tierRows)
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  function fromPrice(catId) {
    const catServices = services.filter((s) => s.category_id === catId)
    let lowest = null
    for (const s of catServices) {
      const svcTiers = tiers.filter((t) => t.service_id === s.id)
      const rates = [Number(s.base_rate), ...svcTiers.map((t) => Number(t.rate))]
      const min = Math.min(...rates)
      if (lowest === null || min < lowest) lowest = min
    }
    return lowest
  }

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))

  if (loading) return <Loader />

  return (
    <div className="page-pad">
      <h1 style={{ fontSize: 18, margin: '4px 0 14px' }}>All Services</h1>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-faint)' }} />
        <input
          placeholder="Search a platform..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No categories found" subtitle="Try a different search." />
      ) : (
        <div className="category-grid">
          {filtered.map((cat) => (
            <CategoryCard key={cat.id} category={cat} fromPrice={fromPrice(cat.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
