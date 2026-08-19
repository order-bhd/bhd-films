import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Loader from '../../components/common/Loader'

export default function AdminLogin() {
  const { isLoggedIn, isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (loading) return <Loader />

  if (isLoggedIn && isAdmin) {
    navigate('/admin', { replace: true })
    return null
  }

  function handleLogin(e) {
    e.preventDefault()
    setError('')

    // SUPER ADMIN LOGIN
    const SUPERADMIN_USERNAME = 'superadmin'
    const SUPERADMIN_PASSWORD = 'BHDflims@2030'

    if (
      username === SUPERADMIN_USERNAME &&
      password === SUPERADMIN_PASSWORD
    ) {
      sessionStorage.setItem('bhd_superadmin', 'true')
      navigate('/admin', { replace: true })
    } else {
      setError('Invalid Super Admin username or password.')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: '#08070c'
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background:
            'linear-gradient(135deg,var(--gold),var(--crimson))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}
      >
        <ShieldCheck size={26} color="#170f08" />
      </div>

      <h1
        style={{
          fontSize: 19,
          margin: '0 0 6px',
          color: 'var(--text)'
        }}
      >
        BHD Films Super Admin
      </h1>

      <p
        className="text-dim"
        style={{
          fontSize: 12.5,
          marginBottom: 22
        }}
      >
        Restricted Super Admin access only.
      </p>

      <form
        onSubmit={handleLogin}
        style={{
          width: '100%',
          maxWidth: 320
        }}
      >
        {/* USERNAME */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 7,
              color: 'var(--text-dim)'
            }}
          >
            Username
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--surface)'
            }}
          >
            <User size={17} />

            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                width: '100%',
                padding: '13px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text)'
              }}
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 7,
              color: 'var(--text-dim)'
            }}
          >
            Password
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 14px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--surface)'
            }}
          >
            <Lock size={17} />

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '13px 0',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text)'
              }}
            />
          </div>
        </div>

        {error && (
          <div
            className="field-error"
            style={{
              marginBottom: 14,
              textAlign: 'center'
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <ShieldCheck size={18} />
          Login as Super Admin
        </button>
      </form>
    </div>
  )
}