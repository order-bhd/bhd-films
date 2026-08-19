import { Clapperboard } from 'lucide-react'

export default function About() {
  return (
    <div className="page-pad">
      <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 12px',
            borderRadius: 16,
            background: 'linear-gradient(135deg,var(--gold),var(--crimson))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Clapperboard size={26} color="#170f08" />
        </div>
        <h1 style={{ fontSize: 19, margin: '0 0 4px' }}>BHD Films</h1>
        <p className="text-faint" style={{ fontSize: 12 }}>Premium Social Media Growth Services</p>
      </div>

      <div className="surface-card" style={{ marginBottom: 12 }}>
        <p className="text-dim" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          BHD Films helps creators and businesses grow their presence across social platforms with transparent,
          rate-controlled services. Every price you see is set live by our team and every order you place uses the
          exact rate shown at checkout, permanently recorded on your order history.
        </p>
      </div>

      <div className="surface-card">
        <p className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
          Need help? Reach out any time from the Support section in your Profile.
        </p>
      </div>
    </div>
  )
}
