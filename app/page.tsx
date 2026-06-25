export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0D0D0D',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, color: '#F5A623', marginBottom: 16 }}>
          kryla.work
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>
          Are you on Kryla.work?
        </p>
      </div>
    </main>
  )
}
