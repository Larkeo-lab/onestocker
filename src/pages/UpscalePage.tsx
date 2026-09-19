import { ImageUpscale, Images, Info, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { HistorySection } from '@/components/library/HistorySection'
import { Button } from '@/components/ui/Button'
import { LibraryPickerDialog } from '@/components/upscale/LibraryPickerDialog'
import { UpscaleAddBar } from '@/components/upscale/UpscaleAddBar'
import { UpscaleJobCard } from '@/components/upscale/UpscaleJobCard'
import { UpscaleResultCard } from '@/components/upscale/UpscaleResultCard'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useCreditCosts, useUpscaleHistory } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { upscaleCost } from '@/lib/creditCosts'
import { cn } from '@/lib/utils'
import { isAwaitingStart, isUploadPending, useUpscaleStore } from '@/store/upscale'

/**
 * หน้าอัปสเกลรูป (/app/upscale)
 *
 * เพิ่มรูปจากเครื่องหรือจากคลังรูป → ระบบวัดขนาดแล้วแสดงขนาดที่ขยายได้ (Full HD / 2K / 4K / 8K)
 * → เลือกขนาดของแต่ละรูป → กดอัปสเกล ผลลัพธ์เก็บถาวรในคลังรูปแท็บอัปสเกล
 * ใต้รายการของรอบนี้เป็นประวัติทั้งหมด โหลดครั้งละ 20 รูป กดดูเพิ่มเติมแล้วต่อท้าย (ดู HistorySection)
 */
export function UpscalePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.upscale'))

  const [skipped, setSkipped] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const costs = useCreditCosts().data
  const jobs = useUpscaleStore((state) => state.jobs)
  const addFiles = useUpscaleStore((state) => state.addFiles)
  const addLibraryImages = useUpscaleStore((state) => state.addLibraryImages)
  const start = useUpscaleStore((state) => state.start)
  const clearDone = useUpscaleStore((state) => state.clearDone)

  const awaiting = jobs.filter(isAwaitingStart)
  const awaitingCount = awaiting.length
  // ราคาต่างกันตามขนาดที่เลือกของแต่ละรูป รวมทีละรูป
  const totalCost = costs
    ? awaiting.reduce((sum, job) => sum + (job.preset ? (upscaleCost(costs, job.preset) ?? 0) : 0), 0)
    : undefined
  const doneCount = jobs.filter((job) => job.status === 'done').length
  const uploadPending = jobs.some(isUploadPending)
  // ผลลัพธ์ของรอบนี้แสดงในการ์ดของรอบนี้แล้ว ประวัติไม่ต้องแสดงซ้ำ (ล้างรายการที่เสร็จแล้ว รูปจะกลับไปอยู่ในประวัติ)
  const sessionResults = new Set(jobs.flatMap((job) => (job.result ? [job.result.id] : [])))
  const history = useUpscaleHistory()

  return (
    <div className={cn(CONTAINER.wide, 'space-y-6 py-6')}>
      <header>
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.upscale')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('upscale.description')}</p>
      </header>

      <div className="space-y-3">
        <UpscaleAddBar
          compact={jobs.length > 0}
          onFiles={(files) => setSkipped(addFiles(files))}
          onOpenLibrary={() => setPickerOpen(true)}
        />

        {skipped.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <ul className="min-w-0 flex-1 space-y-0.5 text-[12.5px] text-warning">
              {skipped.map((message, index) => (
                <li key={index} className="break-words">
                  {message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setSkipped([])}
              aria-label={t('common.close')}
              className="flex size-6 shrink-0 items-center justify-center rounded text-warning transition-colors hover:bg-warning/10"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {jobs.length > 0 ? (
        <>
          <section className="flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border bg-card p-4">
            {awaitingCount > 0 && totalCost !== undefined ? (
              <p className="mr-auto text-[12.5px] text-muted-foreground tabular-nums">
                {t('upscale.startHint', { count: totalCost })}
              </p>
            ) : null}
            <Button variant="primary" onClick={start} disabled={awaitingCount === 0}>
              <ImageUpscale className="size-4" aria-hidden />
              {awaitingCount > 0 ? t('upscale.start', { count: awaitingCount }) : t('upscale.startEmpty')}
            </Button>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold tracking-tight">
                {t('upscale.jobsTitle')}
                <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                  {jobs.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {doneCount > 0 ? (
                  <Button size="sm" variant="ghost" onClick={clearDone}>
                    {t('upscale.clearDone')}
                  </Button>
                ) : null}
                <Link
                  to={`${APP_PATH}/library?tab=upscale`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium transition-colors hover:border-border-strong hover:bg-muted"
                >
                  <Images className="size-3.5" aria-hidden />
                  {t('upscale.viewLibrary')}
                </Link>
              </div>
            </div>

            {uploadPending ? (
              <p className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t('upscale.keepOpenNote')}
              </p>
            ) : null}

            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <UpscaleJobCard key={job.id} job={job} />
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <HistorySection
        title={t('upscale.historyTitle')}
        query={history}
        hide={sessionResults}
        renderItem={(item) => <UpscaleResultCard key={item.id} item={item} />}
      />

      {pickerOpen ? (
        <LibraryPickerDialog
          onClose={() => setPickerOpen(false)}
          onSelect={(images) => {
            setSkipped(addLibraryImages(images))
            setPickerOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
