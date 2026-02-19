import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import { FlashToast } from '@/components/flash-toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Timely — Find a time that works for everyone',
    template: '%s | Timely',
  },
  description: 'Share a link, mark your times, see the overlap.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased flex flex-col min-h-dvh">
        <div className="flex-1">
          {children}
        </div>
        <footer className="px-4 py-6 text-center border-t border-[#E5DDD4]">
          <Link
            href="/privacy"
            className="text-xs text-[#A89E94] hover:text-[#6B6158] underline underline-offset-2 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#E8823A]"
          >
            Privacy
          </Link>
        </footer>
        <FlashToast />
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
