import { ChevronLeft, ChevronRight, Eraser, Images } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ResultCard } from '@/components/removeBg/ResultCard'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useRemoveBgResults } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { errorMessage } from '@/lib/error'
import { cn } from '@/lib/utils'

/** คลังรูป (/app/library) ผลลัพธ์การลบพื้นหลังทั้งหมด ใหม่ไปเก่า */
export function LibraryPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.library'))

  const [requestedPage, setPage] = useState(1)
  const [lastTotalPages, setLastTotalPages] = useState(0)

  // ลบรูปสุดท้ายของหน้าสุดท้ายแล้ว หน้านั้นว่าง ถอยไปหน้าสุดท้ายที่ยังมีรูป
  const page = lastTotalPages > 0 ? Math.min(requestedPage, lastTotalPages) : requestedPage
  const results = useRemoveBgResults({ page })

  const items = results.data?.items ?? []
  const pagination = results.data?.pagination
  if (pagination && pagination.totalPages !== lastTotalPages) {
    setLastTotalPages(pagination.totalPages)
  }

  return (
    <div className={cn(CONTAINER.wide, 'py-6')}>
      <header className="mb-6">
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.library')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('library.description')}</p>
      </header>

      {results.isPending ? <Loading /> : null}

      {results.isError && !results.data ? (
        <ErrorState message={errorMessage(results.error)} onRetry={() => void results.refetch()} />
      ) : null}

      {results.isSuccess && items.length === 0 ? (
        <EmptyState
          icon={Images}
          title={t('library.emptyTitle')}
          description={t('library.emptyBody')}
          action={
            <Link
              to={`${APP_PATH}/remove-bg`}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Eraser className="size-3.5" aria-hidden />
              {t('library.start')}
            </Link>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold tracking-tight">
              {t('library.results')}
              <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                {pagination?.total ?? items.length}
              </span>
            </p>
          </div>

          <ul
            className={cn(
              'grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              // ระหว่างรอหน้าใหม่ยังแสดงหน้าเดิมไว้ ทำให้จางลงจะได้รู้ว่ากำลังโหลด
              results.isPlaceholderData && 'opacity-60',
            )}
          >
            {items.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </ul>

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="size-3.5" aria-hidden />
                {t('common.previous')}
              </Button>
              <span className="font-mono text-[12px] text-subtle-foreground tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('common.next')}
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
