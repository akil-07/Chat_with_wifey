export default function TypingIndicator({ users }) {
  const label = users.length === 1
    ? `${users[0]} is typing`
    : users.length === 2
    ? `${users[0]} and ${users[1]} are typing`
    : `${users[0]} and ${users.length - 1} others are typing`

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.375rem 0.5rem',
    }}>
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', padding: '0.4rem 0.625rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem 1rem 1rem 0.25rem' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--muted-foreground)',
            display: 'inline-block',
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{label}</span>
    </div>
  )
}
