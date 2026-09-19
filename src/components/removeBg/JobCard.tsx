import { CircleCheck, Clock, CloudCheck, Download, Maximize2, RotateCw, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ImageViewer } from '@/components/library/ImageViewer'
import { BrandLoader } from '@/components/ui/BrandLoader'
import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { useImageViewer } from '@/hooks/useImageViewer'
import { DOWNLOAD_LINK_CLASS, displayFiles, formatBytes, resultViewKey } from '@/lib/removeBg'
import { isUploadPending, useRemoveBgStore, type RemoveBgJob } from '@/store/removeBg'
import type { BackgroundRemoval } from '@/types/removeBg'

import { FormatChip, QualityChip, ResultPreview } from './ResultPreview'

/** รูปหนึ่งใบในรอบนี้ ตั้งแต่อัปโหลดจนได้ผลลัพธ์หรือล้มเหลว */
export function JobCard({ job }: { job: RemoveBgJob }) {
  const { t } = useTranslation()
  const retry = useRemoveBgStore((state) => state.retry)
  const dismiss = useRemoveBgStore((state) => state.dismiss)
  const cancelUpload = useRemoveBgStore((state) => state.cancelUpload)
  const viewer = useImageViewer(`job/${job.id}`)

  const result = job.status === 'done' ? job.result : null
  const busy = job.status === 'converting' || job.status === 'uploading' || job.status === 'processing'
  // รอคิวเซิร์ฟเวอร์ยังเป็น processing (ซ่อนปุ่มเอาออก) แต่แสดงไอคอนรอแทนชื่อแอปที่เคลื่อนไหว
  const waiting = job.status === 'waitingUpload' || job.status === 'queued' || job.serverBusy
  // ยังอัปไม่เสร็จ ใช้ปุ่มยกเลิกด้านล่างแทนปุ่มเอาออกมุมรูป
  const uploadPending = isUploadPending(job)

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <ResultPreview
        src={result?.previewUrl ?? job.sourceUrl}
        format={result ? result.format : undefined}
        onOpen={result ? viewer.show : undefined}
      >
        {busy || waiting ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/55">
            {waiting ? (
              <Clock className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <BrandLoader
                label={
                  job.status === 'converting'
                    ? t('removeBg.converting')
                    : job.status === 'uploading'
                      ? t('removeBg.uploading', { percent: job.progress })
                      : t('removeBg.processing')
                }
                className="rounded-full bg-background/80 px-3.5 py-2 shadow-sm"
              />
            )}
          </span>
        ) : null}

        {/* รอคิวอยู่เอาออกได้ ลูปรอจะเลิกส่งเอง */}
        {(busy && !job.serverBusy) || uploadPending ? null : (
          <button
            type="button"
            onClick={() => dismiss(job.id)}
            aria-label={t('removeBg.dismiss')}
            title={t('removeBg.dismiss')}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-xs transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </ResultPreview>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-[13px] font-medium" title={result?.filename ?? job.file.name}>
            {result?.filename ?? job.file.name}
          </p>
          <span className="flex shrink-0 items-center gap-1">
            {job.quality ? <QualityChip quality={job.quality} /> : null}
            {job.format ? <FormatChip format={job.format} /> : null}
          </span>
        </div>

        <JobStatus job={job} />

        {result ? (
          <div className="mt-auto flex gap-2 pt-1">
            {result.url ? (
              <a href={result.url} className={DOWNLOAD_LINK_CLASS}>
                <Download className="size-3.5" aria-hidden />
                {t('removeBg.download')}
              </a>
            ) : null}
            <Button size="sm" className={result.url ? undefined : 'flex-1'} onClick={viewer.show}>
              <Maximize2 className="size-3.5" aria-hidden />
              {t('viewer.open')}
            </Button>
          </div>
        ) : null}

        {result && viewer.open ? (
          <ImageViewer
            previewUrl={result.previewUrl}
            fullUrl={result.url}
            display={displayFiles(result)}
            // key เดียวกับการ์ดในประวัติ (ResultCard) รูปที่โหลดไว้ล่วงหน้าใช้ร่วมกันได้
            preloadKey={resultViewKey(result)}
            // ต้นฉบับยังอยู่ในเบราว์เซอร์ (ไฟล์ที่เลือกมา) เทียบก่อน/หลังได้ ในคลังรูปไม่มีเพราะเซิร์ฟเวอร์ลบต้นฉบับแล้ว
            beforeUrl={job.sourceUrl}
            width={result.width}
            height={result.height}
            transparent={result.format === 'png'}
            filename={result.filename}
            details={resultSize(result)}
            chips={
              <>
                <QualityChip quality={result.quality} />
                <FormatChip format={result.format} />
              </>
            }
            onClose={viewer.close}
          />
        ) : null}

        {uploadPending ? (
          <div className="mt-auto flex pt-1">
            <Button size="sm" className="flex-1" onClick={() => cancelUpload(job.id)}>
              <X className="size-3.5" aria-hidden />
              {t('removeBg.cancelUpload')}
            </Button>
          </div>
        ) : null}

        {job.status === 'error' ? (
          <div className="mt-auto flex pt-1">
            <Button size="sm" className="flex-1" onClick={() => retry(job.id)}>
              <RotateCw className="size-3.5" aria-hidden />
              {t('removeBg.retry')}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

function JobStatus({ job }: { job: RemoveBgJob }) {
  const { t } = useTranslation()

  switch (job.status) {
    case 'converting':
      return <p className="text-[12px] text-primary">{t('removeBg.converting')}</p>

    case 'waitingUpload':
      return <p className="text-[12px] text-muted-foreground">{t('removeBg.waitingUpload')}</p>

    case 'ready':
      return (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CloudCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
          {t('removeBg.ready')}
        </p>
      )

    case 'queued':
      return <p className="text-[12px] text-muted-foreground">{t('removeBg.queued')}</p>

    case 'uploading':
      return (
        <div>
          <p className="text-[12px] text-muted-foreground tabular-nums">
            {t('removeBg.uploading', { percent: job.progress })}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )

    case 'processing':
      return job.serverBusy ? (
        <p className="text-[12px] text-muted-foreground">{t('removeBg.serverBusy')}</p>
      ) : (
        <p className="text-[12px] text-primary">{t('removeBg.processing')}</p>
      )

    case 'done':
      return (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground tabular-nums">
          <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          {t('removeBg.done')}
          {job.result ? <span className="truncate text-subtle-foreground">· {resultSize(job.result)}</span> : null}
        </p>
      )

    case 'error':
      return (
        <p className="flex items-start gap-1.5 text-[12px] text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{job.error}</span>
        </p>
      )
  }
}

/** "2,880×3,840 · 8.8 MB" */
function resultSize(result: BackgroundRemoval): string {
  return `${result.width.toLocaleString(intlLocale())}×${result.height.toLocaleString(intlLocale())} · ${formatBytes(result.sizeBytes)}`
}
