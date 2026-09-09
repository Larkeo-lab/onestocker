import type { ReactNode } from 'react'

import { CONTAINER, type ContainerWidth } from '@/config/container'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  width = 'wide',
}: {
  title: string
  description?: string
  actions?: ReactNode
  width?: ContainerWidth
}) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background/85 backdrop-blur-md">
      <div
        className={cn(
          CONTAINER[width],
          'flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3',
        )}
      >
        <div className="min-w-0">
          <h1 className="truncate text-[15px] leading-tight font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
