import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params

  // Fetch provider from database
  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .eq('page_live', true)
    .single()

  // If no provider found — show 404
  if (!provider) {
    notFound()
  }

  // Fetch their page content
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('provider_id', provider.id)
    .single()

  if (!page) {
    notFound()
  }

  const services = page.services || []
  const highlights = page.highlights || []

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#fafafa',
      color: '#0D0D0D',
    }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a1a 100%)',
        padding: '60px 24px 48px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(245,166,35,0.15)',
          border: '1px solid rgba(245,166,35,0.3)',
          borderRadius: 20,
          padding: '6px 16px',
          marginBottom: 24,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#F5A623', letterSpacing: 1 }}>
            {provider.location}
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 900,
          margin: '0 0 10px',
          letterSpacing: -1,
          lineHeight: 1.1,
        }}>
          {provider.name}
        </h1>

        <p style={{
          fontSize: 16,
          color: '#F5A623',
          fontWeight: 700,
          margin: '0 0 16px',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          {provider.persona_id}
        </p>

        <p style={{
          fontSize: 18,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 500,
          margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          {page.tagline}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#book" style={{
            background: '#F5A623',
            color: '#0D0D0D',
            padding: '14px 32px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}>
            {page.cta_text || 'Book a Session'}
          </a>
          <a href={`https://wa.me/${provider.phone}`} style={{
            background: '#25D366',
            color: '#fff',
            padding: '14px 24px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            display: 'inline-block',
          }}>
            💬 WhatsApp
          </a>
        </div>
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          background: '#fff',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
        }}>
          {highlights.map((h: { icon: string; text: string }, i: number) => (
            <div key={i} style={{
              padding: '20px 32px',
              textAlign: 'center',
              borderRight: '1px solid #f1f5f9',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{h.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{h.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>

        {/* About */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#F5A623',
            letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16,
          }}>About</div>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#374151', margin: 0 }}>
            {page.bio}
          </p>
          <div style={{
            marginTop: 16, fontSize: 14, color: '#6366f1', fontWeight: 600,
          }}>
            🕐 {page.availability}
          </div>
        </div>

        {/* Services */}
        {services.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: '#F5A623',
              letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16,
            }}>What I offer</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {services.map((s: { name: string; price: string; description: string }, i: number) => (
                <div key={i} style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0D0D0D', marginBottom: 4 }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{s.description}</div>
                  </div>
                  <div style={{
                    fontWeight: 900, fontSize: 16, color: '#F5A623',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking form */}
        <div id="book" style={{
          background: '#0D0D0D',
          borderRadius: 20,
          padding: '32px 28px',
          color: '#fff',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#F5A623',
            letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
          }}>Book a session</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Fill in your details. {provider.name.split(' ')[0]} will confirm within a few hours.
          </p>

          <form action={`/api/bookings/create`} method="POST"
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="hidden" name="provider_id" value={provider.id} />

            <input
              name="client_name"
              placeholder="Your name"
              required
              style={{
                padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <input
              name="client_phone"
              placeholder="Your WhatsApp number"
              required
              style={{
                padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <select
              name="service_requested"
              style={{
                padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none',
              }}
            >
              <option value="">Select a service</option>
              {services.map((s: { name: string; price: string }, i: number) => (
                <option key={i} value={s.name}>{s.name} — {s.price}</option>
              ))}
            </select>
            <textarea
              name="message"
              placeholder="Any message or preferred timing (optional)"
              rows={3}
              style={{
                padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14,
                outline: 'none', resize: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#F5A623', color: '#0D0D0D', border: 'none',
                borderRadius: 10, padding: '14px', fontWeight: 800,
                fontSize: 15, cursor: 'pointer',
              }}
            >
              Send booking request →
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48, textAlign: 'center',
          fontSize: 12, color: '#94a3b8',
        }}>
          <svg width="20" height="20" viewBox="0 0 120 120" fill="none" style={{ marginBottom: 4 }}>
            <rect width="120" height="120" rx="26" fill="#0D0D0D"/>
            <rect x="28" y="18" width="10" height="84" rx="5" fill="white"/>
            <line x1="34" y1="60" x2="84" y2="18" stroke="white" strokeWidth="11" strokeLinecap="round"/>
            <line x1="34" y1="60" x2="84" y2="102" stroke="#F5A623" strokeWidth="11" strokeLinecap="round"/>
          </svg>
          <div>Powered by <strong style={{ color: '#F5A623' }}>Kryla.work</strong></div>
          <div style={{ marginTop: 4 }}>Are you on Kryla.work?</div>
        </div>

      </div>
    </div>
  )
}
