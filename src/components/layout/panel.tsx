import { cn } from '@/lib/utils'

interface PanelProps {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'aside'
}

/**
 * Card-like panel component matching Stitch design.
 * Uses soft shadow and subtle border for depth.
 */
export function Panel({ children, className, as: Component = 'div' }: PanelProps) {
  return (
    <Component
      className={cn(
        'bg-surface rounded-lg p-4 md:p-5',
        'border border-border-default/40',
        'shadow-[var(--shadow-card)]',
        className
      )}
    >
      {children}
    </Component>
  )
}

interface PanelTitleProps {
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/**
 * Panel title with optional icon prefix.
 */
export function PanelTitle({ children, icon, className }: PanelTitleProps) {
  return (
    <h3
      className={cn(
        'font-heading font-semibold text-[15px] text-text-primary flex items-center gap-2',
        className
      )}
    >
      {icon && <span className="text-brand">{icon}</span>}
      {children}
    </h3>
  )
}
