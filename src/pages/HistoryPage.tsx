import { ChevronLeft, ChevronRight, History, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/header/PageHeader'
import { HistoryCard } from '@/components/history/HistoryCard'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CONTAINER } from '@/config/container'
import { useAsync } from '@/hooks/useAsync'
import { fetchHistory } from '@/lib/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function HistoryPage() {
  useDocumentTitle('History')

  const [page, setPage] = useState(1)
  const history = useAsync(() => fetchHistory({ page }), [page])

  const items = history.data?.items ?? []
  const pagination = history.data?.pagination

  return (
    <>
      <PageHeader
        title="History"
        description="Everything you have generated, newest first"
      />

      <div className={cn(CONTAINER.wide, 'py-6')}>
        {history.loading ? <Loading /> : null}

        {!history.loading && history.error ? (
          <ErrorState message={history.error} onRetry={history.reload} />
        ) : null}

        {!history.loading && !history.error && items.length === 0 ? (
          <EmptyState
            icon={History}
            title="No history yet"
            description="Every image you generate metadata for is saved here automatically, so you can come back and reuse it later."
            action={
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                <WandSparkles className="size-3.5" aria-hidden />
                Generate your first image
              </Link>
            }
          />
        ) : null}

        {!history.loading && !history.error && items.length > 0 ? (
          <>
            <p className="mb-3 text-[13px] font-semibold tracking-tight">
              Results
              <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                {pagination?.total ?? items.length}
              </span>
            </p>

            <div className="space-y-3">
              {items.map((generation) => (
                <HistoryCard key={generation.id} generation={generation} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  ก่อนหน้า
                </Button>
                <span className="font-mono text-[12px] text-subtle-foreground tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  ถัดไป
                  <ChevronRight className="size-3.5" aria-hidden />
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  )
}
