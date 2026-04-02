import UserAvatar from './UserAvatar'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function MessageBubble({ message, isMine, showAvatar, isGroup, onDelete, conversationUserIds, currentUserId }) {
  // Detect both URL-based images and base64 data URLs (what Firestore stores)
  const isImage = message.file_url && (
    /^data:image\//i.test(message.file_url) ||
    /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(message.file_url)
  )
  const isFile = message.file_url && !isImage
  const [hover, setHover] = useState(false)

  // --- Read receipt logic ---
  // Other members in the conversation (not the sender)
  const otherIds = (conversationUserIds || []).filter(id => id !== message.sender_id)
  const readBy = message.read_by || []
  // Has every other participant read it?
  const isRead = otherIds.length > 0 && otherIds.every(id => readBy.includes(id))
  // Is it at least sent (in Firestore)? Yes if we can see it.
  const isSent = true

  return (
    <div 
      className="animate-fade-in" 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '0.5rem',
        marginBottom: showAvatar ? '0.625rem' : '0.125rem',
        position: 'relative'
      }}>
      {/* Avatar */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {!isMine && showAvatar && (
          <UserAvatar name={message.profiles?.username || '?'} size={28} />
        )}
      </div>

      <div style={{ maxWidth: '66%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '0.2rem' }}>
        {/* Sender name (group) */}
        {isGroup && !isMine && showAvatar && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, paddingLeft: '0.625rem' }}>
            {message.profiles?.username}
          </span>
        )}

        {/* Bubble container with Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
          {/* Bubble */}
          <div style={{
            background: isMine ? 'var(--primary)' : 'var(--card)',
            color: isMine ? 'var(--primary-foreground)' : 'var(--card-foreground)',
            border: isMine ? 'none' : '1px solid var(--border)',
            borderRadius: isMine
              ? '1rem 1rem 0.25rem 1rem'
              : '1rem 1rem 1rem 0.25rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}>
            {/* Image attachment */}
            {isImage && (
              <img
                src={message.file_url}
                alt="attachment"
                onClick={() => window.open(message.file_url, '_blank')}
                style={{
                  maxWidth: '240px', maxHeight: '200px',
                  borderRadius: '0.5rem', display: 'block',
                  marginBottom: message.content ? '0.5rem' : 0,
                  cursor: 'pointer', objectFit: 'cover'
                }}
              />
            )}
            {/* File attachment */}
            {isFile && (
              <a href={message.file_url} target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  color: isMine ? 'var(--primary-foreground)' : 'var(--accent)',
                  fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500,
                  marginBottom: message.content ? '0.5rem' : 0
                }}>
                📎 {decodeURIComponent(message.file_url.split('/').pop())}
              </a>
            )}
            {message.content && <span>{message.content}</span>}
          </div>

          {/* Delete Button (only for own messages on hover) */}
          {isMine && hover && (
            <button 
              onClick={onDelete}
              className="btn-ghost"
              style={{ padding: '0.25rem', color: 'var(--destructive)', opacity: 0.7 }}
              title="Delete message"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Timestamp + Read receipt ticks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingInline: '0.375rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>
            {formatTime(message.created_at)}
          </span>
          {/* Show ticks only for my own messages */}
          {isMine && <MessageTicks isSent={isSent} isRead={isRead} />}
        </div>
      </div>
    </div>
  )
}

// WhatsApp-style tick component
function MessageTicks({ isSent, isRead }) {
  const color = isRead ? '#53bdeb' : '#8a8a8a' // blue when read, grey otherwise

  return (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      title={isRead ? 'Seen' : 'Sent'}
    >
      {/* First tick */}
      <path
        d="M1 5.5L4.5 9L10 2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Second tick — offset to the right for double check */}
      <path
        d="M5 5.5L8.5 9L14 2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
