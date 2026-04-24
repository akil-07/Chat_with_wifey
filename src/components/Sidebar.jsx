import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import {
  MessageCircle, Plus, Search, LogOut, Moon, Sun
} from 'lucide-react'
import NewChatModal from './NewChatModal'
import ConversationItem from './ConversationItem'
import UserAvatar from './UserAvatar'
import ProfileModal from './ProfileModal'
import logo from '../assets/logo.jpg'

export default function Sidebar({ conversations, loadingChats, activeId, onSelect, onDelete, isOnline, isMobile }) {
  const { user, profile } = useAuth()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleDark() {
    document.documentElement.classList.toggle('dark')
    setDark(d => !d)
  }

  const filtered = conversations.filter(c => {
    const term = search.toLowerCase()
    const name = c.is_group
      ? (c.name || '').toLowerCase()
      : (c.otherMember?.username || c.name || '').toLowerCase()
    return name.includes(term)
  })

  return (
    <>
      <aside style={{
        width: isMobile ? '100%' : '300px',
        minWidth: isMobile ? '100%' : '300px',
        height: '100vh',
        background: 'var(--sidebar)',
        borderRight: isMobile ? 'none' : '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
      }}>
        {/* Header */}
        <div className="mobile-safe-top" style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--sidebar-border)' }}>
          <div style={{ height: 'env(safe-area-inset-top)', width: '100%' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img
                src={logo}
                alt="Twogether logo"
                style={{
                  width: 32, height: 32,
                  borderRadius: '8px',
                  objectFit: 'cover',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--sidebar-foreground)', letterSpacing: '-0.3px' }}>Twogether</span>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn-ghost" onClick={toggleDark}
                style={{ padding: '0.375rem', color: 'var(--sidebar-foreground)' }} title="Toggle theme">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="btn-ghost" onClick={() => setShowModal(true)}
                style={{ padding: '0.375rem', color: 'var(--sidebar-foreground)' }} title="New chat">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input
              className="input"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', fontSize: '0.8rem', background: 'var(--background)' }}
            />
          </div>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
          {loadingChats && conversations.length === 0 ? (
            <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', opacity: 1 - i * 0.15 }} className="animate-pulse">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ width: '60%', height: 12, borderRadius: 4, background: 'var(--muted)' }} />
                    <div style={{ width: '40%', height: 10, borderRadius: 4, background: 'var(--muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
              <MessageCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No conversations yet</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>Press + to start one</p>
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={conv.id === activeId}
                onClick={() => onSelect(conv)}
                onDelete={() => onDelete(conv.id)}
                currentUserId={user?.uid}
                isOnline={isOnline}
              />
            ))
          )}
        </div>

        {/* Footer / Profile */}
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }} onClick={() => setShowProfile(true)} onMouseEnter={e => e.currentTarget.style.background = 'var(--muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <UserAvatar name={profile?.username || user?.email || '?'} size={34} online />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--sidebar-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.username || 'You'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>Online</p>
          </div>
          <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); firebaseSignOut(auth); }}
            style={{ padding: '0.375rem', color: 'var(--muted-foreground)' }} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {showModal && (
        <NewChatModal
          onClose={() => setShowModal(false)}
          onCreated={(conv) => { onSelect(conv); setShowModal(false) }}
        />
      )}

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </>
  )
}
