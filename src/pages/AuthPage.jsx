import { useState } from 'react'
import { auth, googleProvider, db } from '../lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { MessageCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleGoogleLogin() {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const res = await signInWithPopup(auth, googleProvider)
      // Check if profile exists, if not create it
      const profileRef = doc(db, 'profiles', res.user.uid)
      const profileSnap = await getDoc(profileRef)
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          username: res.user.displayName || res.user.email.split('@')[0],
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 2rem' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary)', borderRadius: '10px', padding: '0.5rem', display: 'flex' }}>
            <MessageCircle size={22} color="var(--primary-foreground)" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--foreground)' }}>Chattr</span>
        </div>

        <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.25rem' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          {mode === 'login' ? 'Sign in to continue to Chattr' : 'Join Chattr and start chatting'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem', color: 'var(--foreground)' }}>Username</label>
              <input className="input" placeholder="your_username" value={username}
                onChange={e => setUsername(e.target.value)} required minLength={3} />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem', color: 'var(--foreground)' }}>Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem', color: 'var(--foreground)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                style={{ paddingRight: '2.5rem' }} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'color-mix(in srgb, var(--destructive) 12%, transparent)', color: 'var(--destructive)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.8rem', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'color-mix(in srgb, var(--chart-3) 12%, transparent)', color: 'var(--chart-3)', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius)', fontSize: '0.8rem', border: '1px solid color-mix(in srgb, var(--chart-3) 30%, transparent)' }}>
              {success}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem', padding: '0.625rem 1rem', fontSize: '0.9rem' }}>
            {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        </div>

        <button 
          className="btn-ghost" 
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', padding: '0.625rem 1rem', border: '1px solid var(--border)', background: 'var(--card)' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
