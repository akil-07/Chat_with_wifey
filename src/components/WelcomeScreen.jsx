import { MessageCircle } from 'lucide-react'

export default function WelcomeScreen() {
  return (
    <main style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--background)', gap: '1rem',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle glow orb */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(ellipse, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          borderRadius: '50%', padding: '1.25rem',
          marginBottom: '0.5rem',
          boxShadow: '0 8px 32px color-mix(in srgb, var(--primary) 30%, transparent)',
        }}>
          <MessageCircle size={42} color="#fff" />
        </div>
        <h1 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--foreground)', textAlign: 'center', letterSpacing: '-0.5px' }}>
          Welcome to Chattr
        </h1>
        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', maxWidth: '300px', fontSize: '0.875rem', lineHeight: 1.7 }}>
          Select a conversation from the sidebar or start a new one by pressing the <strong>+</strong> button.
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '⚡', label: 'Real-time' },
            { icon: '📎', label: 'File sharing' },
            { icon: '👥', label: 'Group chats' },
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
              padding: '0.875rem 1.125rem',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'calc(var(--radius) * 1.5)', fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--muted-foreground)',
              boxShadow: '0 2px 12px color-mix(in srgb, var(--shadow-color) 5%, transparent)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px color-mix(in srgb, var(--primary) 12%, transparent)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px color-mix(in srgb, var(--shadow-color) 5%, transparent)' }}
            >
              <span style={{ fontSize: '1.4rem' }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
