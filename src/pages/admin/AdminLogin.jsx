import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Chrome } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/common/Loader'

export default function AdminLogin() {
  const { signInWithGoogle, isLoggedIn, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  if (loading) return <Loader />

  if (isLoggedIn && isAdmin) {
    navigate('/admin', { replace: true })
    return null
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e.message || 'Could not start Google sign-in.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#08070c' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,var(--gold),var(--crimson))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <ShieldCheck size={26} color="#170f08" />
      </div>
      <h1 style={{ fontSize: 19, margin: '0 0 6px', color: 'var(--text)' }}>BHD Films Admin</h1>
      <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 22 }}>Authorized personnel only.</p>

      {isLoggedIn && !isAdmin && (
        <p className="text-danger" style={{ fontSize: 12.5, marginBottom: 14, maxWidth: 300, textAlign: 'center' }}>
          This account does not have admin access. Ask a Super Admin to grant it, or sign in with a different account.
        </p>
      )}

      <button className="btn btn-secondary" style={{ maxWidth: 280 }} onClick={handleGoogle}>
        <Chrome size={18} /> Continue with Google
      </button>
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}
