'use client'

import { cn } from '@/lib/utils'

interface GridCellProps {
  slotKey: string
  isSelected: boolean
}

export function GridCell({ slotKey, isSelected }: GridCellProps) {
  return (
    <div
      data-slot-key={slotKey}
      className={cn(
        'min-h-[44px] min-w-[44px] border-b border-r border-[#E5DDD4] select-none cursor-pointer',
        isSelected
          ? 'bg-[#E8823A] border-[#D4722E]'
          : 'bg-white hover:bg-[#F3EFE9]'
      )}
    />
  )
}
