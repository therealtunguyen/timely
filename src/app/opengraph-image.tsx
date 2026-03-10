import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f8fafc',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '80px',
        }}
      >
        {/* Top: Timely brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#6868ed',
              letterSpacing: '-0.02em',
            }}
          >
            Timely
          </span>
        </div>

        {/* Middle: Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '900px',
            }}
          >
            Find a time that works for everyone
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#64748b',
              lineHeight: 1.4,
              maxWidth: '800px',
            }}
          >
            Share a link, mark your times, see the overlap.
          </div>
        </div>

        {/* Bottom: CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: '#6868ed',
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: '10px',
            }}
          >
            Create a free event
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
