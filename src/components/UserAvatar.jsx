export default function UserAvatar({ name = '?', size = 36, online = false }) {
  const initials = name
    .split(/[\s_-]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  // Deterministic hue from name
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
