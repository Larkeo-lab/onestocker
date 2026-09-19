import { Eraser, Images, Info, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { HistorySection } from '@/components/library/HistorySection'
import { FormatPicker } from '@/components/removeBg/FormatPicker'
import { QualityPicker } from '@/components/removeBg/QualityPicker'
import { JobCard } from '@/components/removeBg/JobCard'
import { RemoveBgDropzone } from '@/components/removeBg/RemoveBgDropzone'
import { ResultCard } from '@/components/removeBg/ResultCard'
import { Button } from '@/components/ui/Button'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useCreditCosts, useRemoveBgHistory } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { usePreloadImages } from '@/hooks/usePreloadImages'
import { enabledQualities, preloadFiles, qualityLocked } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import { isAwaitingStart, isUploadPending, useRemoveBgStore } from '@/store/removeBg'
import { useUsageStore } from '@/store/usage'
import { QUALITY_FEATURE, type RemoveBgFormat, type RemoveBgQuality } from '@/types/removeBg'

/**
 * หน้าลบพื้นหลัง (/app/remove-bg)
 *
 * ทำสองจังหวะ: วางรูป → รูปอัปขึ้นก่อน (ยังไม่ใช้เครดิต) → เลือกระดับคุณภาพและรูปแบบ → กดลบพื้นหลัง
 * (ใช้เครดิตต่อรูปตามระดับที่เลือก แอดมินตั้งราคาและเปิด/ปิดแต่ละระดับได้)
 * รูปในรอบนี้แสดงเป็นการ์ดงานด้านบน (เทียบก่อน/หลังได้) ใต้นั้นเป็นประวัติทั้งหมดจากเซิร์ฟเวอร์
 * โหลดครั้งละ 20 รูป กดดูเพิ่มเติมแล้วต่อท้าย (ดู HistorySection)
 */
export function RemoveBgPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.remove-bg'))

  const [format, setFormat] = useState<RemoveBgFormat>('png')
  const [preferredQuality, setQuality] = useState<RemoveBgQuality>('standard')
  const [skipped, setSkipped] = useState<string[]>([])

  /*
    ระดับที่เลือกได้คือระดับที่แอดมินเปิดอยู่ และแพ็กเกจของลูกค้าถึง
    ระดับที่เคยเลือกไว้ถูกปิดหรือแพ็กเกจหมดรอบระหว่างเปิดหน้าค้าง ใช้ระดับแรกที่ยังใช้ได้แทน ไม่ต้องให้ลูกค้ากดเลือกใหม่
  */
  const costs = useCreditCosts().data
  const userType = useUsageStore((state) => state.usage?.userType)
  const qualities = costs ? enabledQualities(costs).filter((item) => !qualityLocked(costs, item, userType)) : []
  const quality = qualities.includes(preferredQuality) ? preferredQuality : qualities[0]
  const cost = costs && quality ? costs[QUALITY_FEATURE[quality]] : undefined
  const jobs = useRemoveBgStore((state) => state.jobs)
  const addFiles = useRemoveBgStore((state) => state.addFiles)
  const start = useRemoveBgStore((state) => state.start)
  const clearDone = useRemoveBgStore((state) => state.clearDone)

  const awaitingCount = jobs.filter(isAwaitingStart).length
  const doneCount = jobs.filter((job) => job.status === 'done').length
  const uploadPending = jobs.some(isUploadPending)
  // ผลลัพธ์ของรอบนี้แสดงในการ์ดของรอบนี้แล้ว ประวัติไม่ต้องแสดงซ้ำ (ล้างรายการที่เสร็จแล้ว รูปจะกลับไปอยู่ในประวัติ)
  const sessionResults = new Set(jobs.flatMap((job) => (job.result ? [job.result.id] : [])))
  const history = useRemoveBgHistory()

  // โหลดไฟล์ดูบนจอของทุกรูปบนหน้าไว้ล่วงหน้า (รอบนี้ก่อน แล้วประวัติตามลำดับ) กดดูรายละเอียดแล้วขึ้นทันที
  usePreloadImages([
    ...jobs.flatMap((job) => (job.result ? preloadFiles(job.result) : [])),
    ...(history.data?.pages ?? []).flatMap((page) => page.items.flatMap(preloadFiles)),
  ])

  return (
    <div className={cn(CONTAINER.wide, 'space-y-6 py-6')}>
      <header>
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.remove-bg')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('removeBg.description')}</p>
      </header>

      <div className="space-y-3">
        <RemoveBgDropzone compact={jobs.length > 0} onFiles={(files) => setSkipped(addFiles(files))} />

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
          {/*
            เลือกรูปแบบแล้วกดเริ่ม ใช้กับทุกรูปที่ยังไม่ได้สั่ง รวมรูปที่ยังอัปไม่เสร็จด้วย
            รูปที่สั่งไปแล้วไม่เปลี่ยนตาม อยากได้อีกแบบให้เพิ่มรูปเดิมเข้ามาใหม่
          */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            {/* แสดงทุกระดับที่เปิดอยู่ รวมระดับที่แพ็กเกจยังไม่ถึง ลูกค้าจะได้เห็นและกดอัปเกรดได้ */}
            {costs && enabledQualities(costs).length > 0 ? (
              <QualityPicker costs={costs} value={quality ?? enabledQualities(costs)[0]} onChange={setQuality} />
            ) : null}
            <FormatPicker value={format} onChange={setFormat} />

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
              {awaitingCount > 0 && cost !== undefined ? (
                <p className="mr-auto text-[12.5px] text-muted-foreground tabular-nums">
                  {t('removeBg.startHint', { count: awaitingCount * cost })}
                </p>
              ) : null}
              <Button
                variant="primary"
                onClick={() => quality && start(format, quality)}
                disabled={awaitingCount === 0 || !quality}
              >
                <Eraser className="size-4" aria-hidden />
                {awaitingCount > 0
                  ? t('removeBg.start', { count: awaitingCount })
                  : t('removeBg.startEmpty')}
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold tracking-tight">
                {t('removeBg.jobsTitle')}
                <span className="ml-2 font-mono text-[11px] font-normal text-subtle-foreground tabular-nums">
                  {jobs.length}
                </span>
              </h2>

              <div className="flex items-center gap-2">
                {doneCount > 0 ? (
                  <Button size="sm" variant="ghost" onClick={clearDone}>
                    {t('removeBg.clearDone')}
                  </Button>
                ) : null}
                <Link
                  to={`${APP_PATH}/library`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium transition-colors hover:border-border-strong hover:bg-muted"
                >
                  <Images className="size-3.5" aria-hidden />
                  {t('removeBg.viewLibrary')}
                </Link>
              </div>
            </div>

            {uploadPending ? (
              <p className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {t('removeBg.keepOpenNote')}
              </p>
            ) : null}

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <HistorySection
        title={t('removeBg.historyTitle')}
        query={history}
        hide={sessionResults}
        renderItem={(item) => <ResultCard key={item.id} item={item} />}
      />
    </div>
  )
}
