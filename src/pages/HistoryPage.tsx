import { ChevronLeft, ChevronRight, Filter, History, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { APP_PATH } from '@/config/site'
import { HistoryCard } from '@/components/history/HistoryCard'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CONTAINER } from '@/config/container'
import { PLATFORMS, platformName } from '@/config/platforms'
import { useHistory } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { errorMessage } from '@/lib/error'
import { cn } from '@/lib/utils'

export function HistoryPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.history'))

  const [page, setPage] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  const platformParam = selectedPlatform === 'all' ? undefined : selectedPlatform

  // แต่ละหน้าและตัวกรองมี cache ของตัวเอง กลับมาหน้าที่เคยเปิดแล้วขึ้นทันทีไม่ยิงซ้ำ
  // สร้าง metadata เสร็จเมื่อไร GenerateProvider สั่งล้าง cache นี้ ประวัติใหม่จึงขึ้นตอนเปิดครั้งถัดไป
  const history = useHistory({ page, platform: platformParam })
  const loading = history.isPending
  const error = history.isError ? errorMessage(history.error) : null

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
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <header className="mb-6">
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight">
            {t('nav.history')}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('history.description')}
          </p>
        </header>

        {!loading && !error ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[13px] font-semibold tracking-tight">
              {t('history.results')}
              <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                {pagination?.total ?? items.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground" aria-hidden />
              <label htmlFor="platform-filter" className="text-[12px] text-muted-foreground">
                {t('history.platform')}
              </label>
              <select
                id="platform-filter"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-[12.5px] font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">{t('history.allPlatforms')}</option>
                {filteredPlatforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platformName(platform, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {loading ? <Loading /> : null}

        {!loading && error ? (
          <ErrorState message={error} onRetry={() => void history.refetch()} />
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <EmptyState
            icon={History}
            title={
              selectedPlatform === 'all'
                ? t('history.emptyTitle')
                : t('history.emptyFilteredTitle')
            }
            description={
              selectedPlatform === 'all'
                ? t('history.emptyBody')
                : t('history.emptyFilteredBody')
            }
            action={
              selectedPlatform === 'all' ? (
                <Link
                  to={APP_PATH}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <WandSparkles className="size-3.5" aria-hidden />
                  {t('history.generateFirst')}
                </Link>
              ) : (
                <Button size="sm" onClick={() => handlePlatformChange('all')}>
                  {t('history.showAll')}
                </Button>
              )
            }
          />
        ) : null}

        {!loading && !error && items.length > 0 ? (
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
                  {t('common.previous')}
                </Button>
                <span className="font-mono text-[12px] text-subtle-foreground tabular-nums">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('common.next')}
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
