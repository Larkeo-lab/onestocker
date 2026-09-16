import { CircleCheck, Clock, CloudCheck, Download, LoaderCircle, RotateCw, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { DOWNLOAD_LINK_CLASS, formatBytes } from '@/lib/removeBg'
import { useRemoveBgStore, type RemoveBgJob } from '@/store/removeBg'

import { FormatChip, ResultPreview } from './ResultPreview'

/** รูปหนึ่งใบในรอบนี้ ตั้งแต่อัปโหลดจนได้ผลลัพธ์หรือล้มเหลว */
export function JobCard({ job }: { job: RemoveBgJob }) {
  const { t } = useTranslation()
  const retry = useRemoveBgStore((state) => state.retry)
  const dismiss = useRemoveBgStore((state) => state.dismiss)

  const result = job.status === 'done' ? job.result : null
  const busy = job.status === 'uploading' || job.status === 'processing'
  const waiting = job.status === 'waitingUpload' || job.status === 'queued'

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <ResultPreview
        src={result?.previewUrl ?? job.sourceUrl}
        format={result ? result.format : undefined}
      >
        {busy || waiting ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/55">
            {waiting ? (
              <Clock className="size-6 text-muted-foreground" aria-hidden />
            ) : (
              <LoaderCircle className="size-7 animate-spin text-primary" aria-hidden />
            )}
          </span>
        ) : null}

        {busy ? null : (
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
          {job.format ? <FormatChip format={job.format} /> : null}
        </div>

        <JobStatus job={job} />

        {result ? (
          <div className="mt-auto flex pt-1">
            {result.url ? (
              <a href={result.url} className={DOWNLOAD_LINK_CLASS}>
                <Download className="size-3.5" aria-hidden />
                {t('removeBg.download')}
              </a>
            ) : null}
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
      return <p className="text-[12px] text-primary">{t('removeBg.processing')}</p>

    case 'done':
      return (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground tabular-nums">
          <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          {t('removeBg.done')}
          {job.result ? (
            <span className="truncate text-subtle-foreground">
              · {job.result.width.toLocaleString(intlLocale())}×{job.result.height.toLocaleString(intlLocale())}
              {' · '}
              {formatBytes(job.result.sizeBytes)}
            </span>
          ) : null}
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
