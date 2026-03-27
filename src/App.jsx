import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'

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
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', color: 'var(--foreground)', lineHeight: 1.8, fontSize: '0.9rem' }}>
            <li>Create a project at <strong>firebase.google.com</strong></li>
            <li>Add a Web App inside the project settings</li>
            <li>Enable <strong>Firestore</strong> and <strong>Authentication</strong> (Email/Pwd, Google)</li>
            <li>Copy your Firebase Config object</li>
            <li>Paste the values into your local <code>.env</code> file</li>
          </ol>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
            Looking for: <code>c:\Users\akils\OneDrive\Desktop\Chat App\.env</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/app" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

