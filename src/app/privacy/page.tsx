import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Timely handles your data.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="space-y-2">
          <Link
            href="/"
            className="text-sm text-text-disabled hover:text-text-secondary focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
          >
            ← Timely
          </Link>
          <h1 className="text-3xl font-semibold text-text-primary">Privacy</h1>
          <p className="text-text-secondary">Plain English. Last updated February 2026.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">What we collect</h2>
          <ul className="space-y-2 text-text-secondary leading-relaxed list-disc list-inside">
            <li>Event details you enter: title, description, dates, time window.</li>
            <li>Your name and a hashed version of your PIN (we never store plaintext PINs).</li>
            <li>Your availability selections (the time slots you mark).</li>
            <li>Your email address, only if you use the magic link option — it is deleted as soon as the link expires.</li>
            <li>Your IP address, briefly, to enforce rate limits on event creation. It is not stored.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">How it&apos;s stored</h2>
          <p className="text-text-secondary leading-relaxed">
            Data is stored in a PostgreSQL database hosted by Neon (US region). We use
            session cookies to keep you signed in — these are scoped to the specific event
            you joined and expire after 7 days. No tracking cookies. No analytics scripts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Automatic expiry</h2>
          <p className="text-text-secondary leading-relaxed">
            Every event and all of its data — responses, participant names, availability
            selections — is automatically and permanently deleted 30 days after the event
            was created. No action required on your part.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Deleting your event early</h2>
          <p className="text-text-secondary leading-relaxed">
            If you created an event, you can delete it immediately from the event&apos;s manage
            page. Look for the &quot;Manage event&quot; link on your event page — it&apos;s only
            visible to you, the creator. Deleting the event removes all responses
            permanently and cannot be undone.
          </p>
          <p className="text-text-secondary leading-relaxed">
            If you lose access to the manage page (for example, you cleared your browser
            cookies), the event will still expire automatically in 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">No accounts</h2>
          <p className="text-text-secondary leading-relaxed">
            Timely has no user accounts. You identify yourself by name and PIN, scoped to
            a single event. There is no profile, no history across events, and nothing to
            delete at an account level.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Questions</h2>
          <p className="text-text-secondary leading-relaxed">
            Questions or concerns? Open an issue on{' '}
            <a
              href="https://github.com/tmoreton/timely/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-text-primary focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
