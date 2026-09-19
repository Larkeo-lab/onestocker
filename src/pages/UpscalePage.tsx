import { ImageUpscale, Images, Info, Lock, TriangleAlert, X } from 'lucide-react'
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
import { PAID_GRADIENT } from '@/lib/plans'
import { upscaleLockedPlan } from '@/lib/upscale'
import { cn } from '@/lib/utils'
import { isAwaitingStart, isUploadPending, useUpscaleStore } from '@/store/upscale'
import { useUsageStore } from '@/store/usage'
import type { UserType } from '@/types/profile'

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
  // แอดมินตั้งให้ทุกขนาดใช้ได้เฉพาะแพ็กเกจที่สูงกว่าของลูกค้า แสดงหน้าอัปเกรดแทนช่องเพิ่มรูป
  const userType = useUsageStore((state) => state.usage?.userType)
  const openPlans = useUsageStore((state) => state.openPlans)
  const lockedPlan = upscaleLockedPlan(costs, userType)
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
        {lockedPlan ? (
          <UpscaleLocked plan={lockedPlan} onUpgrade={openPlans} />
        ) : (
          <UpscaleAddBar
            compact={jobs.length > 0}
            onFiles={(files) => setSkipped(addFiles(files))}
            onOpenLibrary={() => setPickerOpen(true)}
          />
        )}

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

/**
 * ทุกขนาดต้องใช้แพ็กเกจที่สูงกว่าของลูกค้า แสดงแทนช่องเพิ่มรูป กดแล้วเปิดป๊อปอัปแพ็กเกจให้อัปเกรด
 * เรืองแสงแบบเดียวกับระดับ Pro ในหน้าลบพื้นหลัง (ดู QualityPicker) ชุดสีเดียวกับแพ็กเกจเสียเงิน
 */
function UpscaleLocked({ plan, onUpgrade }: { plan: UserType; onUpgrade: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="relative">
      {/* แสงเรืองด้านหลัง */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-1 rounded-2xl opacity-40 blur-[8px] motion-safe:animate-pulse',
          PAID_GRADIENT,
        )}
      />
      {/* ขอบไล่เฉด: ชั้นนอกเป็นสีไล่ ชั้นในเป็นพื้นการ์ด เว้นขอบไว้ 1.5px */}
      <div className={cn('relative rounded-xl p-[1.5px]', PAID_GRADIENT)}>
        <section className="flex flex-col items-center gap-3 rounded-[10.5px] bg-card px-6 py-10 text-center">
          <span
            className={cn('flex size-11 items-center justify-center rounded-full text-white shadow-sm', PAID_GRADIENT)}
          >
            <ImageUpscale className="size-5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="text-[14px] font-semibold tracking-tight">{t('upscale.lockedTitle', { plan })}</h2>
            <p className="mx-auto max-w-md text-[12.5px] text-muted-foreground">{t('upscale.lockedDescription')}</p>
          </div>
          <Button variant="primary" onClick={onUpgrade}>
            {t('upscale.lockedAction')}
          </Button>
        </section>
      </div>
      {/* ป้ายแพ็กเกจคร่อมขอบด้านบน */}
      <span
        className={cn(
          'pointer-events-none absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5',
          'text-[10.5px] font-semibold tracking-wide text-white shadow-sm',
          PAID_GRADIENT,
        )}
      >
        <Lock className="size-2.5" aria-hidden />
        {t('upscale.planOnly', { plan })}
      </span>
    </div>
  )
}
