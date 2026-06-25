type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#0D0D0D',
      color: '#fff',
    }}>
      <svg width="64" height="64" viewBox="0 0 120 120" fill="none" style={{ marginBottom: 32 }}>
        <rect width="120" height="120" rx="26" fill="#1a1a1a"/>
        <rect x="28" y="18" width="10" height="84" rx="5" fill="white"/>
        <line x1="34" y1="60" x2="84" y2="18" stroke="white" strokeWidth="11" strokeLinecap="round"/>
        <line x1="34" y1="60" x2="84" y2="102" stroke="#F5A623" strokeWidth="11" strokeLinecap="round"/>
      </svg>

      <div style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: '#F5A623',
        marginBottom: 16,
      }}>
        kryla.work
      </div>

      <h1 style={{
        fontSize: 32,
        fontWeight: 900,
        margin: '0 0 12px',
        letterSpacing: -1,
      }}>
        {slug}.kryla.work
      </h1>

      <p style={{
        fontSize: 16,
        color: 'rgba(255,255,255,0.45)',
        margin: 0,
      }}>
        This page is being set up. Check back soon.
      </p>
    </div>
  )
}
