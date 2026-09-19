import {
  CircleCheck,
  Clock,
  CloudCheck,
  Download,
  Info,
  Lock,
  Maximize2,
  RotateCw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ImageViewer } from '@/components/library/ImageViewer'
import { ResultPreview } from '@/components/removeBg/ResultPreview'
import { BrandLoader } from '@/components/ui/BrandLoader'
import { Button } from '@/components/ui/Button'
import i18n, { intlLocale } from '@/config/i18n'
import { useCreditCosts } from '@/hooks/queries'
import { useImageViewer } from '@/hooks/useImageViewer'
import { PAID_GRADIENT } from '@/lib/plans'
import { DOWNLOAD_LINK_CLASS, formatBytes } from '@/lib/removeBg'
import { MAX_FACTOR, estimateText, presetOptions, presetShortName, type PresetOption } from '@/lib/upscale'
import { cn } from '@/lib/utils'
import { originalUrl, useUpscaleStore, type UpscaleJob } from '@/store/upscale'
import { useUsageStore } from '@/store/usage'

import { UpscaleChips } from './UpscaleResultCard'

/**
 * รูปหนึ่งใบในรอบนี้ แสดงขนาดปัจจุบันและขนาดที่ขยายได้ ให้เลือกก่อนกดอัปสเกล
 * กดอัปสเกลแล้วขนาดที่เลือกถูกล็อก เหลือแสดงแค่ขนาดที่เลือก
 */
export function UpscaleJobCard({ job }: { job: UpscaleJob }) {
  const { t } = useTranslation()
  const setPreset = useUpscaleStore((state) => state.setPreset)
  const retry = useUpscaleStore((state) => state.retry)
  const dismiss = useUpscaleStore((state) => state.dismiss)
  const viewer = useImageViewer(`upscale-job/${job.id}`)

  const locale = intlLocale()
  const result = job.status === 'done' ? job.result : null
  const busy =
    job.status === 'converting' ||
    job.status === 'uploading' ||
    job.status === 'processing' ||
    job.status === 'measuring'
  // รอคิวเซิร์ฟเวอร์ยังเป็น processing แต่แสดงไอคอนรอแทนชื่อแอปที่เคลื่อนไหว และเอาออกได้
  const waiting = job.status === 'waitingUpload' || job.status === 'queued' || job.serverBusy
  const costs = useCreditCosts().data
  const userType = useUsageStore((state) => state.usage?.userType)
  const options =
    job.width !== null && job.height !== null ? presetOptions(job.width, job.height, costs, userType) : []
  const chosen = options.find((option) => option.preset === job.preset)
  const limited = (reason: PresetOption['unavailable']) => options.some((option) => option.unavailable === reason)

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <ResultPreview
        src={result?.previewUrl ?? job.previewUrl}
        format={job.transparent ? 'png' : undefined}
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
                    ? t('upscale.converting')
                    : job.status === 'measuring'
                      ? t('upscale.measuring')
                      : job.status === 'uploading'
                        ? t('upscale.uploading', { percent: job.progress })
                        : processingText(job)
                }
                className="rounded-full bg-background/80 px-3.5 py-2 shadow-sm"
              />
            )}
          </span>
        ) : null}
        {busy && !job.serverBusy ? null : (
          <button
            type="button"
            onClick={() => dismiss(job.id)}
            aria-label={t('upscale.dismiss')}
            title={t('upscale.dismiss')}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-xs transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </ResultPreview>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium" title={result?.filename ?? job.filename}>
            {result?.filename ?? job.filename}
          </p>
          <p className="text-[11.5px] text-subtle-foreground tabular-nums">
            {job.status === 'converting'
              ? t('upscale.converting')
              : job.width === null || job.height === null
                ? t('upscale.measuring')
              : t('upscale.currentSize', {
                  width: job.width.toLocaleString(locale),
                  height: job.height.toLocaleString(locale),
                  mp: (Math.round((job.width * job.height) / 100_000) / 10).toLocaleString(locale),
                })}
            {' · '}
            {formatBytes(job.sizeBytes)}
          </p>
        </div>

        {/* ยังไม่ได้กด เลือกขนาดได้ กดแล้วแสดงแค่ขนาดที่เลือก */}
        {options.length > 0 && job.preset !== null && !job.started && job.status !== 'done' ? (
          <fieldset>
            <legend className="mb-1 text-[11.5px] font-medium text-muted-foreground">{t('upscale.chooseSize')}</legend>
            <div className="space-y-1">
              {options.map((option) => (
                <PresetRow
                  key={option.preset}
                  jobId={job.id}
                  option={option}
                  selected={option.preset === job.preset}
                  onSelect={() => setPreset(job.id, option.preset)}
                />
              ))}
            </div>
            {/* ป้ายด้านขวาของแถวสั้น บอกเหตุผลเต็มไว้ใต้รายการ ลูกค้าจะได้รู้ว่าทำไมเลือกไม่ได้ */}
            {limited('tooSmall') ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-px size-3 shrink-0" aria-hidden />
                {t('upscale.tooSmallNote', { factor: MAX_FACTOR })}
              </p>
            ) : null}
          </fieldset>
        ) : chosen && job.status !== 'error' ? (
          <p className="rounded-lg bg-primary-soft px-2.5 py-1.5 text-[12px] text-primary tabular-nums">
            → {chosen.label} · {(result?.width ?? chosen.width).toLocaleString(locale)} ×{' '}
            {(result?.height ?? chosen.height).toLocaleString(locale)} · AI
          </p>
        ) : null}

        <JobStatus job={job} />

        {result ? (
          <div className="mt-auto flex gap-2 pt-1">
            {result.url ? (
              <a href={result.url} className={DOWNLOAD_LINK_CLASS}>
                <Download className="size-3.5" aria-hidden />
                {t('upscale.download')}
                <span className="font-normal opacity-80">· {formatBytes(result.sizeBytes)}</span>
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
            // ต้นฉบับยังอยู่ในเบราว์เซอร์ (หรือในคลังรูป) เทียบก่อน/หลังได้ ประวัติไม่มีเพราะเซิร์ฟเวอร์ลบต้นฉบับแล้ว
            beforeUrl={originalUrl(job)}
            afterLabel={t('viewer.upscaled')}
            width={result.width}
            height={result.height}
            transparent={result.format === 'png'}
            filename={result.filename}
            details={`${result.width.toLocaleString(locale)}×${result.height.toLocaleString(locale)} · ${formatBytes(result.sizeBytes)}`}
            chips={<UpscaleChips item={result} />}
            // key เดียวกับการ์ดในประวัติ (UpscaleResultCard)
            preloadKey={`upscale/${result.id}`}
            onClose={viewer.close}
          />
        ) : null}

        {job.status === 'error' && job.preset !== null && job.width !== null ? (
          <div className="mt-auto flex pt-1">
            <Button size="sm" className="flex-1" onClick={() => retry(job.id)}>
              <RotateCw className="size-3.5" aria-hidden />
              {t('upscale.retry')}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

function PresetRow({
  jobId,
  option,
  selected,
  onSelect,
}: {
  jobId: string
  option: PresetOption
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const locale = intlLocale()
  const openPlans = useUsageStore((state) => state.openPlans)
  const disabled = option.unavailable !== null
  const size = `${option.width.toLocaleString(locale)} × ${option.height.toLocaleString(locale)} · ${option.megapixels.toLocaleString(locale)} MP`

  /*
    แพ็กเกจยังไม่ถึง เรืองแสงแบบเดียวกับระดับ Pro ในหน้าลบพื้นหลัง กดแล้วเปิดป๊อปอัปแพ็กเกจให้อัปเกรด
    ไม่ใช่ตัวเลือก (เลือกไม่ได้) จึงเป็นปุ่ม ไม่ใช่ radio
  */
  if (option.unavailable === 'plan' && option.plan) {
    return (
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-0.5 rounded-xl opacity-30 blur-[6px] motion-safe:animate-pulse',
            PAID_GRADIENT,
          )}
        />
        <button
          type="button"
          onClick={openPlans}
          className={cn(
            'relative block w-full rounded-lg p-[1.5px] text-left focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none',
            PAID_GRADIENT,
          )}
        >
          <span className="flex items-center gap-2 rounded-[6.5px] bg-card px-2.5 py-1.5">
            <Lock className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-medium">{option.label}</span>
              <span className="block text-[11px] text-muted-foreground tabular-nums">{size}</span>
            </span>
            <span className="shrink-0 text-[10.5px] font-semibold text-primary">
              {t('upscale.planOnly', { plan: option.plan })}
            </span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <label
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
        'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40',
        disabled
          ? 'cursor-not-allowed border-border opacity-50'
          : selected
            ? 'cursor-pointer border-primary bg-primary-soft'
            : 'cursor-pointer border-border hover:border-border-strong',
      )}
    >
      <input
        type="radio"
        name={`upscale-preset-${jobId}`}
        value={option.preset}
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="accent-primary"
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[12.5px] font-medium', selected && 'text-primary')}>{option.label}</span>
        <span className="block text-[11px] text-muted-foreground tabular-nums">
          {size}
          {option.credits !== undefined && option.unavailable === null ? (
            <span className={cn('font-medium', selected ? 'text-primary' : 'text-foreground')}>
              {' · '}
              {t('upscale.cost', { count: option.credits })}
            </span>
          ) : null}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-right text-[10.5px] tabular-nums',
          option.unavailable === null ? 'font-medium text-primary' : 'text-subtle-foreground',
        )}
      >
        {option.unavailable === 'notLarger'
          ? t('upscale.notLarger')
          : option.unavailable === 'tooSmall'
            ? t('upscale.tooSmall')
            : option.unavailable === 'off'
              ? t('upscale.presetOff')
              : `AI ${option.factor}×`}
      </span>
    </label>
  )
}

function JobStatus({ job }: { job: UpscaleJob }) {
  const { t } = useTranslation()

  switch (job.status) {
    // บอกไว้ในบรรทัดขนาดรูปแล้ว
    case 'converting':
    case 'measuring':
      return null
    case 'waitingUpload':
      return <p className="text-[12px] text-muted-foreground">{t('upscale.waitingUpload')}</p>
    case 'uploading':
      return (
        <div>
          <p className="text-[12px] text-muted-foreground tabular-nums">{t('upscale.uploading', { percent: job.progress })}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )
    case 'ready':
      return (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CloudCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
          {t('upscale.ready')}
        </p>
      )
    case 'queued':
      return <p className="text-[12px] text-muted-foreground">{t('upscale.queued')}</p>
    case 'processing':
      return job.serverBusy ? (
        <p className="text-[12px] text-muted-foreground">{t('upscale.serverBusy')}</p>
      ) : (
        <p className="text-[12px] text-primary">
          {t('upscale.processing', { size: job.preset ? presetShortName(job.preset) : '' })}
          {job.estimateSeconds ? (
            <span className="block text-muted-foreground tabular-nums">{estimateText(job.estimateSeconds)}</span>
          ) : null}
        </p>
      )
    case 'done':
      return (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          {t('upscale.done')}
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

/** "กำลังขยายเป็น 4K ด้วย AI… ปกติใช้เวลาราว 14 วินาที" สำหรับโปรแกรมอ่านหน้าจอ */
function processingText(job: UpscaleJob): string {
  const text = i18n.t('upscale.processing', { size: job.preset ? presetShortName(job.preset) : '' })
  return job.estimateSeconds ? `${text} ${estimateText(job.estimateSeconds)}` : text
}
