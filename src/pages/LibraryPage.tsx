import type { UseQueryResult } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eraser, ImageUpscale, Images } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { ResultCard } from '@/components/removeBg/ResultCard'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { UpscaleResultCard } from '@/components/upscale/UpscaleResultCard'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useRemoveBgResults, useUpscales } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { Pagination } from '@/lib/api'
import { errorMessage } from '@/lib/error'
import { cn } from '@/lib/utils'

type Tab = 'remove-bg' | 'upscale'

/**
 * คลังรูป (/app/library) ผลลัพธ์ที่เก็บถาวร แยกแท็บลบพื้นหลังกับอัปสเกล ใหม่ไปเก่า
 * แท็บอยู่ใน URL (?tab=upscale) หน้าอัปสเกลลิงก์มาที่แท็บของตัวเองได้
 */
export function LibraryPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.library'))

  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'upscale' ? 'upscale' : 'remove-bg'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'remove-bg', label: t('library.tabRemoveBg') },
    { id: 'upscale', label: t('library.tabUpscale') },
  ]

  return (
    <div className={cn(CONTAINER.wide, 'py-6')}>
      <header className="mb-4">
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.library')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('library.description')}</p>
      </header>

      <div className="mb-5 flex gap-1 border-b border-border" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setSearchParams(item.id === 'upscale' ? { tab: 'upscale' } : {}, { replace: true })}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
              tab === item.id
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* key แยกต่อแท็บ เปลี่ยนแท็บแล้วเริ่มหน้า 1 ใหม่ */}
      {tab === 'upscale' ? <UpscaleTab key="upscale" /> : <RemoveBgTab key="remove-bg" />}
    </div>
  )
}

function RemoveBgTab() {
  const { t } = useTranslation()
  const { page, setPage, syncTotalPages } = usePage()
  const results = useRemoveBgResults({ page })
  syncTotalPages(results.data?.pagination.totalPages)
  return (
    <ResultsGrid
      results={results}
      page={page}
      onPage={setPage}
      empty={
        <EmptyState
          icon={Images}
          title={t('library.emptyTitle')}
          description={t('library.emptyBody')}
          action={<StartLink to={`${APP_PATH}/remove-bg`} icon={<Eraser className="size-3.5" aria-hidden />} label={t('library.start')} />}
        />
      }
      renderItem={(item) => <ResultCard key={item.id} item={item} />}
    />
  )
}

function UpscaleTab() {
  const { t } = useTranslation()
  const { page, setPage, syncTotalPages } = usePage()
  const results = useUpscales({ page })
  syncTotalPages(results.data?.pagination.totalPages)
  return (
    <ResultsGrid
      results={results}
      page={page}
      onPage={setPage}
      empty={
        <EmptyState
          icon={ImageUpscale}
          title={t('library.emptyUpscaleTitle')}
          description={t('library.emptyUpscaleBody')}
          action={<StartLink to={`${APP_PATH}/upscale`} icon={<ImageUpscale className="size-3.5" aria-hidden />} label={t('library.startUpscale')} />}
        />
      }
      renderItem={(item) => <UpscaleResultCard key={item.id} item={item} />}
    />
  )
}

/**
 * หน้าปัจจุบันที่ไม่เกินจำนวนหน้าจริง
 * ลบรูปสุดท้ายของหน้าสุดท้ายแล้ว หน้านั้นว่าง ถอยไปหน้าสุดท้ายที่ยังมีรูป
 *
 * syncTotalPages ต้องเรียกระหว่าง render ของคอมโพเนนต์เดียวกับที่เรียก hook นี้
 * (ปรับ state ของตัวเองระหว่าง render ได้ แต่ปรับ state ของคอมโพเนนต์อื่นไม่ได้)
 */
function usePage() {
  const [requested, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const page = totalPages > 0 ? Math.min(requested, totalPages) : requested
  function syncTotalPages(total: number | undefined) {
    if (total !== undefined && total !== totalPages) setTotalPages(total)
  }
  return { page, setPage, syncTotalPages }
}

function ResultsGrid<T>({
  results,
  page,
  onPage,
  empty,
  renderItem,
}: {
  results: UseQueryResult<{ items: T[]; pagination: Pagination }>
  page: number
  onPage: (page: number) => void
  empty: ReactNode
  renderItem: (item: T) => ReactNode
}) {
  const { t } = useTranslation()
  const items = results.data?.items ?? []
  const pagination = results.data?.pagination

  if (results.isPending) return <Loading />
  if (results.isError && !results.data) {
    return (
      <ErrorState
        message={errorMessage(results.error)}
        error={results.error}
        onRetry={() => void results.refetch()}
      />
    )
  }
  if (items.length === 0) return <>{empty}</>

  return (
    <>
      <p className="mb-4 text-[13px] font-semibold tracking-tight">
        {t('library.results')}
        <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
          {pagination?.total ?? items.length}
        </span>
      </p>

      <ul
        className={cn(
          'grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          // ระหว่างรอหน้าใหม่ยังแสดงหน้าเดิมไว้ ทำให้จางลงจะได้รู้ว่ากำลังโหลด
          results.isPlaceholderData && 'opacity-60',
        )}
      >
        {items.map(renderItem)}
      </ul>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="size-3.5" aria-hidden />
            {t('common.previous')}
          </Button>
          <span className="font-mono text-[12px] text-subtle-foreground tabular-nums">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button size="sm" disabled={page >= pagination.totalPages} onClick={() => onPage(page + 1)}>
            {t('common.next')}
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}
    </>
  )
}

function StartLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      {icon}
      {label}
    </Link>
  )
}
