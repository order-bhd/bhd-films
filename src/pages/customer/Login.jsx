import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Clapperboard, Chrome } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { signInWithGoogle, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn) {
    navigate(location.state?.from || '/', { replace: true })
    return null
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e.message || 'Could not start Google sign-in.')
      setLoading(false)
    }
  }

  return (
    <div className="page-pad" style={{ display: 'flex', flexDirection: 'column', minHeight: '80dvh', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 34 }}>
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            borderRadius: 18,
            background: 'linear-gradient(135deg,var(--gold),var(--crimson))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Clapperboard size={30} color="#170f08" />
        </div>
        <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>Welcome to BHD Films</h1>
        <p className="text-dim" style={{ fontSize: 13, margin: 0 }}>
          Sign in to manage your wallet, place orders and track everything in one place.
        </p>
      </div>

      <button className="btn btn-secondary" onClick={handleGoogle} disabled={loading}>
        <Chrome size={18} /> {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {error && <div className="field-error" style={{ textAlign: 'center', marginTop: 12 }}>{error}</div>}

      <p className="text-faint" style={{ fontSize: 11, textAlign: 'center', marginTop: 22 }}>
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  )
}
