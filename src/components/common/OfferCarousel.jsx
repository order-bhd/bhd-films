import { useEffect, useRef, useState } from 'react'
import PromoBanner from './GradientBanner'

// Auto-sliding carousel for the home page's promotional offers. Slides
// change on their own every few seconds (a slow, continuous "play"), and
// small dots below show which offer is currently showing. If there's only
// one active offer, it's shown as a single still banner — nothing to slide
// between, so no animation runs.
export default function OfferCarousel({ offers }) {
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    setIndex(0)
    if (offers.length <= 1) return undefined
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % offers.length)
    }, 4500)
    return () => clearInterval(timerRef.current)
  }, [offers])

  if (offers.length === 0) return null

  return (
    <div>
      <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${index * 100}%)`,
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {offers.map((o) => (
            <div key={o.id} style={{ flex: '0 0 100%', minWidth: '100%' }}>
              <PromoBanner title={o.title} description={o.description} icon={o.icon} gradient={o.gradient} />
            </div>
          ))}
        </div>
      </div>

      {offers.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {offers.map((o, i) => (
            <span
              key={o.id}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? 'var(--gold)' : 'var(--border)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
