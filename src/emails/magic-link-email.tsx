import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  eventTitle: string
  magicUrl: string
  participantName: string
}

export function MagicLinkEmail({ eventTitle, magicUrl, participantName }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your access link for {eventTitle}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '24px' }}>
          <Text style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
            Hi {participantName},
          </Text>
          <Text style={{ color: '#64748b', lineHeight: '1.6' }}>
            Here&apos;s your access link for <strong>{eventTitle}</strong>. It expires in 30 minutes and can only be used once.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={magicUrl}
              style={{
                backgroundColor: '#6868ed',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Access my availability
            </Button>
          </Section>
          <Text style={{ color: '#A89E94', fontSize: '13px' }}>
            If you didn&apos;t request this link, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
