'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyLinkButtonProps {
  url: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      onClick={handleCopy}
      className="w-full bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 rounded-lg"
    >
      {copied ? 'Link copied!' : 'Copy link'}
    </Button>
  )
}
