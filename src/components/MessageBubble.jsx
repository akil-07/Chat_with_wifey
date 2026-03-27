import UserAvatar from './UserAvatar'

export default function MessageBubble({ message, isMine, showAvatar, isGroup }) {
  const isImage = message.file_url && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(message.file_url)
  const isFile = message.file_url && !isImage

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '0.5rem',
      marginBottom: showAvatar ? '0.625rem' : '0.125rem',
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

        {/* Timestamp */}
        <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', paddingInline: '0.375rem' }}>
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
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
