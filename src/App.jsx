import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'

// Global error boundary — catches any runtime crash and shows a useful fallback
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#12121e', color: '#cdd6f4', padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
          <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Twogether
          </h1>
          <p style={{ color: '#a6adc8', marginBottom: '1.5rem' }}>
            Something went wrong. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #8839ef, #04a5e5)',
              color: '#fff', border: 'none', borderRadius: '0.75rem',
              padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Refresh
          </button>
          {/* Always show error for diagnosis */}
          <pre style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#f38ba8', maxWidth: '600px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {import.meta.env.DEV ? this.state.error?.toString() : null}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/app" replace /> : children
}

import { AudioCallProvider } from './contexts/AudioCallContext'
import IncomingCallBanner from './components/IncomingCallBanner'
import AudioCallModal from './components/AudioCallModal'

export default function App() {
  const isConfigured = 
    import.meta.env.VITE_FIREBASE_API_KEY && 
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    !import.meta.env.VITE_FIREBASE_API_KEY.includes('your_api_key')

  if (!isConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '1rem' }}>
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem 2rem' }}>
          <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>🔥 Firebase Setup Required</h1>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', lineHeight: 1.6 }}>
            The application is running, but you need to configure your Firebase credentials.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AudioCallProvider>
          <BrowserRouter>
            <IncomingCallBanner />
            <AudioCallModal />
            <Routes>
              <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
              <Route path="/app" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </BrowserRouter>
        </AudioCallProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
