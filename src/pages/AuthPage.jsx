import { useState, useEffect } from 'react'
import { auth, googleProvider, db } from '../lib/firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { DottedSurface } from '../components/DottedSurface'
import { SignInCard } from '../components/ui/sign-in-card-2'
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
    // Initialize Capacitor Google Auth
    if (Capacitor.isNativePlatform()) {
       GoogleAuth.initialize({
         clientId: '607701397217-2obs4grgqi4opsj8idog1cmoaves4v1v.apps.googleusercontent.com',
         scopes: ['profile', 'email'],
         grantOfflineAccess: true,
       })
    }

    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  async function handleGoogleLogin() {
    try {
      if (Capacitor.isNativePlatform()) {
        setError(''); setSuccess(''); setLoading(true);
        const googleUser = await GoogleAuth.signIn()
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
        const res = await signInWithCredential(auth, credential)
        await createProfileIfNotExists(res)
        setLoading(false)
      } else {
        // Call popup IMMEDIATELY to prevent iOS Safari from blocking it.
        // Do not put state updates (like setLoading) before this line.
        const res = await signInWithPopup(auth, googleProvider)
        setError(''); setSuccess(''); setLoading(true);
        await createProfileIfNotExists(res)
        setLoading(false)
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function createProfileIfNotExists(res) {
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
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px' }}>
        <SignInCard
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          username={username} setUsername={setUsername}
          onSubmit={handleSubmit}
          onGoogleLogin={handleGoogleLogin}
          isLoading={loading}
          mode={mode} setMode={setMode}
          error={error} success={success}
        />
      </div>

      <style>{`        @keyframes spin { to { transform: rotate(360deg); } }
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
