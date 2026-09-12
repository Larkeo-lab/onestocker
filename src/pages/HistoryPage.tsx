import { ChevronLeft, ChevronRight, Filter, History, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/header/PageHeader'
import { HistoryCard } from '@/components/history/HistoryCard'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CONTAINER } from '@/config/container'
import { PLATFORMS } from '@/config/platforms'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { fetchHistory } from '@/lib/api'
import { cn } from '@/lib/utils'

export function HistoryPage() {
  useDocumentTitle('History')

  const [page, setPage] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const platformParam = selectedPlatform === 'all' ? undefined : selectedPlatform

  const history = useAsync(
    () => fetchHistory({ page, platform: platformParam }),
    [page, selectedPlatform]
  )

  const items = history.data?.items ?? []
  const pagination = history.data?.pagination
  const availablePlatformIds = history.data?.availablePlatforms ?? []
  const filteredPlatforms = PLATFORMS.filter((platform) =>
    availablePlatformIds.includes(platform.id)
  )

  const handlePlatformChange = (newPlatform: string) => {
    setSelectedPlatform(newPlatform)
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="History"
        description="Everything you have generated, newest first"
      />

      <div className={cn(CONTAINER.wide, 'py-6')}>
        {!history.loading && !history.error ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[13px] font-semibold tracking-tight">
              Results
              <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                {pagination?.total ?? items.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground" aria-hidden />
              <label htmlFor="platform-filter" className="text-[12px] text-muted-foreground">
                Platform:
              </label>
              <select
                id="platform-filter"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-[12.5px] font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Platforms</option>
                {filteredPlatforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {history.loading ? <Loading /> : null}

        {!history.loading && history.error ? (
          <ErrorState message={history.error} onRetry={history.reload} />
        ) : null}

        {!history.loading && !history.error && items.length === 0 ? (
          <EmptyState
            icon={History}
            title={selectedPlatform === 'all' ? "No history yet" : "No results for this platform"}
            description={
              selectedPlatform === 'all'
                ? "Every image you generate metadata for is saved here automatically, so you can come back and reuse it later."
                : "No metadata generations found for the selected platform."
            }
            action={
              selectedPlatform === 'all' ? (
                <Link
                  to="/"
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <WandSparkles className="size-3.5" aria-hidden />
                  Generate your first image
                </Link>
              ) : (
                <Button size="sm" onClick={() => handlePlatformChange('all')}>
                  Show All Platforms
                </Button>
              )
            }
          />
        ) : null}

        {!history.loading && !history.error && items.length > 0 ? (
          <>
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
