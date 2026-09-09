import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'neutral' | 'primary' | 'success' | 'warning'
}) {
  const toneClass = {
    neutral: 'text-subtle-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  }[tone]

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('size-3.5', toneClass)} aria-hidden />
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[22px] leading-none font-medium tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}
