import { useState } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { X, User, Loader2, Check } from 'lucide-react'
import UserAvatar from './UserAvatar'

export default function ProfileModal({ onClose }) {
  const { user, profile, fetchProfile } = useAuth()
  const [username, setUsername] = useState(profile?.username || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      // Force format: lowercase, no spaces
      const formattedUsername = username.toLowerCase().replace(/\s+/g, '')
      
      const profileRef = doc(db, 'profiles', user.uid)
      await updateDoc(profileRef, {
        username: formattedUsername
      })
      
      // Refresh AuthContext profile
      await fetchProfile(user.uid)
      
      setUsername(formattedUsername)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '380px', padding: '1.5rem', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--foreground)' }}>Edit Profile</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <UserAvatar name={username || profile?.username || '?'} size={80} />
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem', color: 'var(--foreground)' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
              <input
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ paddingLeft: '2.1rem' }}
                placeholder="your_username"
              />
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
              Other users will use this exact name to search for you. Spaces will be removed.
            </p>
          </div>

          {error && <div style={{ color: 'var(--destructive)', fontSize: '0.8rem', marginTop: '-0.25rem' }}>{error}</div>}

          <button className="btn-primary" type="submit" disabled={saving || username === profile?.username}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : success ? <Check size={16} /> : null}
            {success ? 'Saved!' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
