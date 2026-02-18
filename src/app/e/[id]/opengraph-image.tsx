import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'  // OG image generation runs at the edge

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Next.js 15+: must await params

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  })

  const title = event?.title ?? 'Timely Event'
  const description = event?.description ?? 'Mark your availability'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#FAF8F5',
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
              color: '#E8823A',
              letterSpacing: '-0.02em',
            }}
          >
            Timely
          </span>
        </div>

        {/* Middle: Event details */}
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
              fontSize: 56,
              fontWeight: 700,
              color: '#1C1A17',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '900px',
              // Truncate very long titles
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>
          {description && (
            <div
              style={{
                fontSize: 28,
                color: '#6B6158',
                lineHeight: 1.4,
                maxWidth: '800px',
              }}
            >
              {description}
            </div>
          )}
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
              background: '#E8823A',
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: '10px',
            }}
          >
            Mark your availability
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // Note: custom fonts not loaded here — system fonts used.
      // For Inter font in OG images, fetch from Google Fonts or use a local font file.
      // Keeping simple for Phase 1; can enhance in Phase 5.
    }
  )
}
