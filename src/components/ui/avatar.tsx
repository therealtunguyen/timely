'use client'

import { cn } from '@/lib/utils'

/**
 * Generate a deterministic color from a name string using a simple hash.
 * Returns a hue value (0-360) for HSL color.
 */
function hashNameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  // Map to 0-360 range for hue
  return Math.abs(hash) % 360
}

/**
 * Extract initials from a name (up to 2 characters).
 * "John Doe" -> "JD", "Alice" -> "AL", "Bob Smith Jr" -> "BS"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const hue = hashNameToHue(name)

  // Use a consistent saturation and lightness for pleasant colors
  const backgroundColor = `hsl(${hue}, 65%, 55%)`

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor }}
      aria-hidden="true"
      title={name}
    >
      {initials}
    </div>
  )
}
