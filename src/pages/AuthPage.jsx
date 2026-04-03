import { useState, useEffect } from 'react'
import { auth, googleProvider, db } from '../lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { DottedSurface } from '../components/DottedSurface'
import logo from '../assets/logo.jpg'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  async function handleGoogleLogin() {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const res = await signInWithPopup(auth, googleProvider)
      const profileRef = doc(db, 'profiles', res.user.uid)
      const profileSnap = await getDoc(profileRef)
      if (!profileSnap.exists()) {
        const defaultName = res.user.displayName || res.user.email.split('@')[0]
        const formattedName = defaultName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000)
        await setDoc(profileRef, {
          username: formattedName,
          avatar_url: res.user.photoURL,
          created_at: new Date().toISOString()
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'register') {
        const res = await createUserWithEmailAndPassword(auth, email, password)
        await setDoc(doc(db, 'profiles', res.user.uid), {
          username: username.trim().toLowerCase(),
          avatar_url: null,
          created_at: new Date().toISOString()
        })
        setSuccess('Account created! You are now logged in.')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050508', // near-black like the reference
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Dotted Background */}
      <DottedSurface darkMode={isDark} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: isDark
          ? 'radial-gradient(ellipse, rgba(203,166,247,0.12) 0%, transparent 70%)'
          : 'radial-gradient(ellipse, rgba(136,57,239,0.1) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Brand header (top left) */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        left: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 10,
      }}>
        <img
          src={logo}
          alt="Twogether logo"
          style={{
            width: 34, height: 34,
            borderRadius: '10px',
            objectFit: 'cover',
            boxShadow: isDark ? '0 0 20px rgba(203,166,247,0.3)' : '0 0 20px rgba(136,57,239,0.25)',
          }}
        />
        <span style={{
          fontWeight: 700,
          fontSize: '1.15rem',
          color: isDark ? '#cdd6f4' : '#4c4f69',
          letterSpacing: '-0.3px',
        }}>Twogether</span>
      </div>

      {/* Auth card */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        width: '100%',
        maxWidth: '420px',
        background: isDark
          ? 'rgba(30, 30, 46, 0.75)'
          : 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: isDark
          ? '1px solid rgba(203,166,247,0.15)'
          : '1px solid rgba(136,57,239,0.12)',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        boxShadow: isDark
          ? '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(203,166,247,0.05)'
          : '0 24px 80px rgba(136,57,239,0.1), 0 1px 0 rgba(255,255,255,0.9) inset',
        animation: 'fadeInUp 0.4s ease both',
      }}>
        {/* Heading */}
        <div style={{ marginBottom: '2rem' }}>
          {/* Logo in card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img
              src={logo}
              alt="Twogether"
              style={{
                width: 48, height: 48,
                borderRadius: '12px',
                objectFit: 'cover',
                boxShadow: isDark
                  ? '0 4px 16px rgba(203,166,247,0.25)'
                  : '0 4px 16px rgba(136,57,239,0.2)',
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: isDark ? '#cdd6f4' : '#1e1e2e', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
                Twogether
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: isDark ? '#cba6f7' : '#8839ef', marginTop: '0.15rem' }}>
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </div>
            </div>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: isDark ? '#cdd6f4' : '#1e1e2e', lineHeight: 1.2, marginBottom: '0.4rem', letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </h1>
          <p style={{ color: isDark ? '#a6adc8' : '#6c6f85', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {mode === 'login'
              ? 'Enter your details to access your chats.'
              : 'Join Twogether and start connecting instantly.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle(isDark)}>Username</label>
              <input
                className="auth-input"
                placeholder="your_username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                style={inputStyle(isDark)}
              />
            </div>
          )}

          <div>
            <label style={labelStyle(isDark)}>Email address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle(isDark)}
            />
          </div>

          <div>
            <label style={labelStyle(isDark)}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="auth-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ ...inputStyle(isDark), paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isDark ? '#585b70' : '#9ca0b0',
                  display: 'flex', padding: 0,
                  transition: 'color 0.2s',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: isDark ? 'rgba(243,139,168,0.1)' : 'rgba(210,15,57,0.07)',
              color: isDark ? '#f38ba8' : '#d20f39',
              padding: '0.625rem 0.75rem',
              borderRadius: '0.625rem',
              fontSize: '0.8rem',
              border: `1px solid ${isDark ? 'rgba(243,139,168,0.2)' : 'rgba(210,15,57,0.15)'}`,
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: isDark ? 'rgba(166,227,161,0.1)' : 'rgba(64,160,43,0.07)',
              color: isDark ? '#a6e3a1' : '#40a02b',
              padding: '0.625rem 0.75rem',
              borderRadius: '0.625rem',
              fontSize: '0.8rem',
              border: `1px solid ${isDark ? 'rgba(166,227,161,0.2)' : 'rgba(64,160,43,0.15)'}`,
            }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #cba6f7, #89b4fa)'
                : 'linear-gradient(135deg, #8839ef, #04a5e5)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.25rem',
              boxShadow: isDark
                ? '0 4px 20px rgba(203,166,247,0.25)'
                : '0 4px 20px rgba(136,57,239,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.2s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }} />
          <span style={{ fontSize: '0.72rem', color: isDark ? '#585b70' : '#9ca0b0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }} />
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            padding: '0.7rem 1rem',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: '0.75rem',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
            color: isDark ? '#cdd6f4' : '#4c4f69',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,1)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Switch mode */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: isDark ? '#a6adc8' : '#6c6f85' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#cba6f7' : '#8839ef',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-input:focus {
          border-color: ${isDark ? '#cba6f7' : '#8839ef'} !important;
          box-shadow: 0 0 0 3px ${isDark ? 'rgba(203,166,247,0.15)' : 'rgba(136,57,239,0.12)'} !important;
          outline: none;
        }
      `}</style>
    </div>
  )
}

function labelStyle(isDark) {
  return {
    fontSize: '0.78rem',
    fontWeight: 600,
    display: 'block',
    marginBottom: '0.4rem',
    color: isDark ? '#a6adc8' : '#6c6f85',
    letterSpacing: '0.2px',
  }
}

function inputStyle(isDark) {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: isDark ? '#cdd6f4' : '#4c4f69',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '0.625rem',
    padding: '0.65rem 0.875rem',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: '100%',
  }
}
