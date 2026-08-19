import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()

    setError('')
    setShake(false)
    setLoading(true)

    try {
      // LOGIN WITH SUPABASE
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (loginError) {
        throw loginError
      }

      if (!data?.user || !data?.session) {
        throw new Error('Login failed. No valid session found.')
      }

      // CHECK IF THIS USER IS AN ADMIN
      const { data: adminUser, error: adminError } =
        await supabase
          .from('admin_users')
          .select('id, role')
          .eq('id', data.user.id)
          .maybeSingle()

      if (adminError) {
        console.error('Admin check error:', adminError)
        await supabase.auth.signOut()

        throw new Error(
          'Could not verify admin access. Please check admin_users table.'
        )
      }

      if (!adminUser) {
        await supabase.auth.signOut()

        throw new Error(
          'You do not have Super Admin permission.'
        )
      }

      // OPTIONAL: Allow only super_admin
      if (adminUser.role !== 'super_admin') {
        await supabase.auth.signOut()

        throw new Error(
          'This account does not have Super Admin access.'
        )
      }

      // SUCCESS
      navigate('/admin', { replace: true })

    } catch (err) {
      console.error('Login error:', err)

      setError(
        err.message ||
        'Invalid email or password.'
      )

      setShake(true)

      setTimeout(() => {
        setShake(false)
      }, 500)

    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes adminFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-8px);
          }
          75% {
            transform: translateX(8px);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .admin-login-box {
          animation: fadeUp 0.6s ease;
        }

        .admin-logo-motion {
          animation: adminFloat 3s ease-in-out infinite;
        }

        .admin-shake {
          animation: shake 0.4s ease;
        }

        .admin-input {
          transition: all 0.25s ease;
        }

        .admin-input:focus {
          transform: translateY(-2px);
          border-color: var(--gold) !important;
          box-shadow: 0 0 0 3px rgba(220, 180, 70, 0.12);
        }

        .admin-login-btn {
          transition: all 0.25s ease;
        }

        .admin-login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        .admin-login-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: '#08070c'
        }}
      >
        <form
          onSubmit={handleLogin}
          className={`admin-login-box ${shake ? 'admin-shake' : ''}`}
          style={{
            width: '100%',
            maxWidth: 420,
            padding: 28
          }}
        >
          {/* LOGO */}
          <div
            className="admin-logo-motion"
            style={{
              width: 70,
              height: 70,
              margin: '0 auto 22px',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, var(--gold), var(--crimson))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                '0 12px 35px rgba(230, 160, 50, 0.18)'
            }}
          >
            <ShieldCheck size={32} color="#170f08" />
          </div>

          <h1
            style={{
              textAlign: 'center',
              margin: '0 0 8px',
              color: 'var(--text)'
            }}
          >
            BHD Films Super Admin
          </h1>

          <p
            className="text-dim"
            style={{
              textAlign: 'center',
              marginBottom: 30,
              fontSize: 13
            }}
          >
            Sign in with your authorized admin account.
          </p>

          {/* EMAIL */}
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 13
            }}
          >
            Email Address
          </label>

          <div
            style={{
              position: 'relative',
              marginBottom: 20
            }}
          >
            <Mail
              size={19}
              style={{
                position: 'absolute',
                left: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#aaa',
                pointerEvents: 'none'
              }}
            />

            <input
              className="admin-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              autoComplete="email"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '17px 18px 17px 52px',
                borderRadius: 14,
                border: '1px solid #2b2b35',
                background: '#18171d',
                color: '#fff',
                outline: 'none',
                fontSize: 16
              }}
            />
          </div>

          {/* PASSWORD */}
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 13
            }}
          >
            Password
          </label>

          <div
            style={{
              position: 'relative',
              marginBottom: 12
            }}
          >
            <Lock
              size={19}
              style={{
                position: 'absolute',
                left: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#aaa',
                pointerEvents: 'none'
              }}
            />

            <input
              className="admin-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '17px 55px 17px 52px',
                borderRadius: 14,
                border: '1px solid #2b2b35',
                background: '#18171d',
                color: '#fff',
                outline: 'none',
                fontSize: 16
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                color: '#ff7b7b',
                fontSize: 13,
                marginBottom: 14,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="admin-login-btn"
            style={{
              width: '100%',
              border: 'none',
              padding: '17px',
              borderRadius: 16,
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 16,
              fontWeight: 700,
              background:
                'linear-gradient(135deg, var(--gold), #ffe080)',
              color: '#211607',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? (
              <>
                <Loader2 size={21} className="spin" />
                Signing In...
              </>
            ) : (
              <>
                <ShieldCheck size={21} />
                Login as Super Admin
              </>
            )}
          </button>
        </form>
      </div>
    </>
  )
}