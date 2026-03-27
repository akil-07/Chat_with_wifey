import { MessageCircle, Sparkles } from 'lucide-react'

export default function WelcomeScreen() {
  return (
    <main style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--background)', gap: '1rem',
      padding: '2rem',
    }}>
      <div style={{
        background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        borderRadius: '50%', padding: '1.5rem',
        marginBottom: '0.5rem',
      }}>
        <MessageCircle size={48} style={{ color: 'var(--primary)', opacity: 0.9 }} />
      </div>
      <h1 style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--foreground)', textAlign: 'center' }}>
        Welcome to Chattr
      </h1>
      <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', maxWidth: '320px', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Select a conversation from the sidebar or start a new one by pressing the <strong>+</strong> button.
      </p>
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
        {[
          { icon: '⚡', label: 'Real-time' },
          { icon: '🗂️', label: 'File sharing' },
          { icon: '👥', label: 'Group chats' },
        ].map(f => (
          <div key={f.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
            padding: '0.875rem 1.25rem',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: '0.78rem',
            color: 'var(--muted-foreground)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>{f.icon}</span>
            {f.label}
          </div>
        ))}
      </div>
    </main>
  )
}
