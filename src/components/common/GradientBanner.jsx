import { getIcon } from '../../utils/iconMap'

const GLOW_COLORS = {
  gold: 'rgba(212,175,55,0.9)',
  crimson: 'rgba(230,57,80,0.9)',
  violet: 'rgba(139,92,246,0.9)'
}

export default function PromoBanner({ title, description, icon = 'sparkles', gradient = 'gold' }) {
  const Icon = getIcon(icon)
  const g = GLOW_COLORS[gradient] ? gradient : 'gold'

  return (
    <div className={`promo-banner grad-${g}`}>
      <div className="glow" style={{ background: GLOW_COLORS[g] }} />
      <p className="promo-title">{title}</p>
      {description && <p className="promo-desc">{description}</p>}
      <Icon size={20} style={{ position: 'absolute', bottom: 14, right: 16, opacity: 0.55, color: '#fff' }} />
    </div>
  )
}
