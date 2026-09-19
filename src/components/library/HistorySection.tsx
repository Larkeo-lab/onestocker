import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import type { Pagination } from '@/lib/api'
import { errorMessage } from '@/lib/error'

type Page<T> = { items: T[]; pagination: Pagination }

const GRID_CLASS = 'grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

/** จำนวนการ์ดโครงตอนโหลดครั้งแรก เต็มสองแถวบนจอกว้าง */
const SKELETON_CARDS = 8

/**
 * ประวัติผลลัพธ์ทั้งหมดใต้หน้าทำงาน (ลบพื้นหลัง อัปสเกล) ใหม่ไปเก่า
 * โหลดทีละหน้า (ดู HISTORY_PAGE_SIZE) กดดูเพิ่มเติมแล้วต่อท้าย
 *
 * hide = id ของผลลัพธ์ที่แสดงในการ์ดของรอบนี้แล้ว ไม่แสดงซ้ำ
 */
export function HistorySection<T extends { id: string }>({
  title,
  query,
  hide,
  renderItem,
}: {
  title: string
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>>
  hide: ReadonlySet<string>
  renderItem: (item: T) => ReactNode
}) {
  const { t } = useTranslation()

  if (query.isPending) {
    return (
      <section className="space-y-3" role="status" aria-label={t('common.loading')}>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" aria-hidden />
        <ul className={GRID_CLASS} aria-hidden>
          <SkeletonCards count={SKELETON_CARDS} />
        </ul>
      </section>
    )
  }
  if (query.isError && !query.data) {
    return <ErrorState message={errorMessage(query.error)} error={query.error} onRetry={() => void query.refetch()} />
  }

  const pages = query.data.pages
  // รูปใหม่ที่แทรกด้านบนระหว่างโหลดหน้าถัดไปทำให้รายการเลื่อน กันรูปเดียวกันโผล่สองครั้ง
  const seen = new Set<string>()
  const items: T[] = []
  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id) || hide.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
  }
  const total = pages.at(-1)?.pagination.total ?? 0
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0)
  if (items.length === 0 && !query.hasNextPage) return null

  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold tracking-tight">
        {title}
        <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">{total}</span>
      </h2>

      <ul className={GRID_CLASS}>
        {items.map(renderItem)}
        {/* กำลังโหลดหน้าถัดไป แสดงการ์ดโครงต่อท้ายเท่าจำนวนที่จะมาเพิ่ม (ไม่เกินหนึ่งหน้า) */}
        {query.isFetchingNextPage ? (
          <SkeletonCards count={Math.max(1, Math.min(pages[0].pagination.limit, total - loaded))} />
        ) : null}
      </ul>

      {query.isFetchNextPageError ? (
        <p className="text-center text-[12px] text-danger">{errorMessage(query.error)}</p>
      ) : null}

      {query.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
            {t('common.loadMore')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

/** การ์ดโครงหน้าตาเดียวกับ LibraryItemCard (รูปย่อ 4:3 ชื่อ รายละเอียด ป้าย ปุ่ม) */
function SkeletonCards({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <li key={index} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card" aria-hidden>
      <div className="aspect-4/3 animate-pulse border-b border-border bg-muted" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="flex gap-1">
          <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-1.5 flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </li>
  ))
}
