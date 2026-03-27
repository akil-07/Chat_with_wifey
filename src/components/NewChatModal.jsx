import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { X, Search, UserPlus, Users, Loader2 } from 'lucide-react'
import UserAvatar from './UserAvatar'

export default function NewChatModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        // Firestore doesn't have native case-insensitive ILIKE.
        // As a simple workaround for this project, we'll fetch users that start with the query
        const q = query(
          collection(db, 'profiles'),
          where('username', '>=', searchQuery.toLowerCase()),
          where('username', '<=', searchQuery.toLowerCase() + '\uf8ff')
        )
        const snap = await getDocs(q)
        const users = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid)
        setResults(users)
      } catch (e) {
        console.error(e)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery, user.uid])

  function toggleUser(u) {
    setSelected(prev =>
      prev.find(s => s.id === u.id) ? prev.filter(s => s.id !== u.id) : [...prev, u]
    )
  }

  async function create() {
    if (selected.length === 0 || !db) return
    setCreating(true)
    const isGroup = selected.length > 1

    try {
      const convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const convData = {
        name: isGroup ? groupName || 'Group Chat' : null,
        is_group: isGroup,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // Same as created_at initially
        createdBy: user.uid,
        userIds: [user.uid, ...selected.map(s => s.id)] // Stored here for easy queries
      }
      
      await setDoc(doc(db, 'conversations', convId), convData)
      
      // We also store members separately for structured access if needed
      await setDoc(doc(db, 'conversation_members', convId), {
        conversation_id: convId,
        userIds: [user.uid, ...selected.map(s => s.id)],
        joined_at: new Date().toISOString()
      })

      onCreated({ id: convId, ...convData })
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>New Conversation</h2>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0.25rem' }}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
          <input
            className="input" placeholder="Search by username prefix…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem' }} autoFocus
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
            {selected.map(u => (
              <span key={u.id} onClick={() => toggleUser(u)} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                color: 'var(--primary)', borderRadius: '99px',
                padding: '0.2rem 0.625rem 0.2rem 0.375rem',
                fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)'
              }}>
                <UserAvatar name={u.username} size={16} />
                {u.username}
                <X size={10} />
              </span>
            ))}
          </div>
        )}

        {/* Group name (when >1 selected) */}
        {selected.length > 1 && (
          <div style={{ marginBottom: '0.875rem' }}>
            <input className="input" placeholder="Group name (optional)" value={groupName}
              onChange={e => setGroupName(e.target.value)} />
          </div>
        )}

        {/* Results */}
        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '1rem' }}>
          {searching && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--muted-foreground)' }} />
            </div>
          )}
          {results.map(u => {
            const isSelected = selected.some(s => s.id === u.id)
            return (
              <div key={u.id} onClick={() => toggleUser(u)} style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.5rem', borderRadius: 'var(--radius)',
                cursor: 'pointer', transition: 'background 0.15s',
                background: isSelected ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent'
              }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--muted)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <UserAvatar name={u.username} size={32} />
                <span style={{ fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>{u.username}</span>
                {isSelected && <UserPlus size={14} style={{ color: 'var(--primary)' }} />}
              </div>
            )
          })}
          {!searching && searchQuery && results.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted-foreground)', padding: '1rem' }}>No users found starts with "{searchQuery}"</p>
          )}
        </div>

        <button className="btn-primary" onClick={create} disabled={selected.length === 0 || creating}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem' }}>
          {creating
            ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            : selected.length > 1 ? <Users size={15} /> : <UserPlus size={15} />
          }
          {selected.length > 1 ? 'Create Group' : 'Start Chat'}
        </button>
      </div>
    </div>
  )
}
