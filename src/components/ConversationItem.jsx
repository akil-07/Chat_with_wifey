import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function ConversationItem({ conversation, active, onClick, onDelete, currentUserId, isOnline }) {
  const [hover, setHover] = useState(false)
  const lastMsg = conversation.lastMessage
  const unread = !active ? (conversation.unreadCount || 0) : 0

  const preview = lastMsg
    ? lastMsg.content || (lastMsg.file_url ? '📎 Attachment' : '')
    : 'No messages yet'

  const displayName = conversation.is_group
    ? conversation.name || 'Group Chat'
    : conversation.otherMember?.username || conversation.name || 'Direct Message'

  const otherMemberId = conversation.userIds?.find(id => id !== currentUserId)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        background: active ? 'color-mix(in srgb, var(--sidebar-primary) 12%, transparent)' : 'transparent',
        borderRight: active ? '3px solid var(--sidebar-primary)' : '3px solid transparent',
        transition: 'background 0.15s',
        position: 'relative'
      }}
    >
      <UserAvatar
        name={displayName}
        size={44}
        online={!conversation.is_group && otherMemberId ? isOnline?.(otherMemberId) : false}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{
            fontWeight: unread > 0 ? 700 : 600, fontSize: '0.9rem',
            color: active ? 'var(--sidebar-primary)' : 'var(--sidebar-foreground)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
            {(!hover || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) && lastMsg && (
              <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                {formatTime(lastMsg.created_at)}
              </span>
            )}
            {hover && !/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) && (
              <button
                className="btn-ghost"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                style={{ padding: '0.2rem', color: 'var(--destructive)', opacity: 0.7 }}
                title="Delete conversation"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{
            fontSize: '0.78rem',
            color: unread > 0 ? 'var(--foreground)' : 'var(--muted-foreground)',
            fontWeight: unread > 0 ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>
            {preview}
          </p>
          {/* Unread badge */}
          {unread > 0 && (
            <span style={{
              background: 'var(--chart-3)', // green
              color: '#fff',
              borderRadius: '99px',
              fontSize: '0.65rem',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              flexShrink: 0,
              marginLeft: '0.375rem',
            }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Inline UserAvatar to prevent import loop or just duplicate the simple code since it was small
function UserAvatar({ name = '?', size = 36, online = false }) {
  const initials = name
    .split(/[\s_-]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `hsl(${hue}, 55%, 58%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700,
        fontSize: size * 0.38,
        userSelect: 'none', flexShrink: 0,
      }}>
        {initials || '?'}
      </div>
      {online && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: size * 0.3, height: size * 0.3,
          background: '#40a02b', borderRadius: '50%',
          border: '2px solid var(--card)',
        }} />
      )}
    </div>
  )
}
