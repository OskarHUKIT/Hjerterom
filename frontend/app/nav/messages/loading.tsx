export default function MessagesLoading() {
  return (
    <div
      className="container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '45vh',
        color: 'var(--text-muted)',
      }}
    >
      <p style={{ fontSize: '1rem', margin: 0 }}>Laster meldinger…</p>
    </div>
  )
}
