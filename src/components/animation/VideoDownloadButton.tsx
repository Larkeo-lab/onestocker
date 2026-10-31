import { Download, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { useCreditCosts } from '@/hooks/queries'
import { animationCost, videoChoiceActions } from '@/lib/creditCosts'
import { DOWNLOAD_LINK_CLASS } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import { lengthFor, videoUrlFor, type VideoChoice } from '@/lib/videoFormats'
import { useClipVideo, useVideoStore, type VideoState } from '@/store/animationVideo'
import type { AnimationResult } from '@/types/animation'

/**
 * ปุ่มดาวน์โหลดวิดีโอแบบที่เลือก (ชนิดไฟล์ × fps × ความยาว ด้วย FormatSelect) ของคลิปหนึ่ง
 * render แบบนั้นแล้วเป็นลิงก์ดาวน์โหลด ยังไม่ render กดแล้ว render ก่อนแล้วดาวน์โหลดให้เอง
 * ระหว่าง render แสดงความคืบหน้าในปุ่ม ใช้ทั้งในหน้าสร้าง ประวัติ และหน้ารายการเดียว
 *
 * compact = การ์ดในประวัติ ข้อความสั้น (MP4 ที่ fps และความยาวของคลิป)
 */
export function VideoDownloadButton({
  item: original,
  choice,
  compact = false,
}: {
  item: AnimationResult
  /** ไม่ใส่ = MP4 ที่ fps และความยาวของคลิป */
  choice?: VideoChoice
  compact?: boolean
}) {
  const { t } = useTranslation()
  const render = useVideoStore((store) => store.render)
  const cancel = useVideoStore((store) => store.cancel)
  const picked: VideoChoice = choice ?? { format: 'mp4', fps: original.fps as VideoChoice['fps'] }
  const selected: VideoChoice = { ...picked, seconds: lengthFor(original, picked) }
  const { item, state } = useClipVideo(original, selected)
  const url = videoUrlFor(item, selected)
  const { data: costs } = useCreditCosts()
  // ราคาแสดงเฉพาะตอนยังไม่ render render แล้วโหลดซ้ำไม่เสียเครดิต
  const price = animationCost(costs, videoChoiceActions(selected, selected.seconds ?? original.seconds))
  const label = compact ? 'MP4' : t('animation.download')
  const priced = price === undefined ? label : `${label} · ${t('animation.credits', { count: price })}`
  const icon = compact ? 'size-3.5' : 'size-4'

  if (url) {
    return (
      <a href={url} className={cn(DOWNLOAD_LINK_CLASS, 'flex h-9 w-full', compact && 'h-8')}>
        <Download className={icon} aria-hidden />
        {label}
      </a>
    )
  }

  // ระหว่าง render: ปุ่มความคืบหน้า (กดไม่ได้) คู่กับปุ่มยกเลิก หยุดแล้วกลับเป็นปุ่มดาวน์โหลดเหมือนยังไม่ได้กด
  if (state?.kind === 'rendering') {
    return (
      <div className="flex w-full gap-2">
        <Button variant="primary" size={compact ? 'sm' : undefined} className="min-w-0 flex-1" disabled>
          <LoaderCircle className={cn('animate-spin', icon)} aria-hidden />
          {state.cancelling ? (compact ? '…' : t('animation.cancelling')) : renderingLabel(t, state, compact)}
        </Button>
        <Button
          variant="danger"
          size={compact ? 'sm' : undefined}
          onClick={() => cancel(item.id, selected)}
          disabled={state.cancelling}
          aria-label={t('animation.cancel')}
          title={t('animation.cancel')}
        >
          <X className={icon} aria-hidden />
          {compact ? null : t('animation.cancel')}
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-1.5">
      <Button
        variant="primary"
        size={compact ? 'sm' : undefined}
        className="w-full"
        onClick={() => render(item.id, selected)}
        title={t('animation.video.hint')}
      >
        {state?.kind === 'failed' ? <RotateCcw className={icon} aria-hidden /> : <Download className={icon} aria-hidden />}
        {priced}
      </Button>
      {state?.kind === 'failed' && !compact ? <p className="text-[12px] text-danger">{state.message}</p> : null}
    </div>
  )
}

function renderingLabel(t: ReturnType<typeof useTranslation>['t'], state: VideoState, compact: boolean) {
  const job = state.kind === 'rendering' ? state.job : undefined
  if (job?.stage === 'rendering' && job.framesTotal) {
    const percent = Math.floor(((job.framesDone ?? 0) / job.framesTotal) * 100)
    return compact ? `${percent}%` : t('animation.step.renderingPercent', { percent })
  }
  if (job?.stage === 'saving') return compact ? '…' : t('animation.step.saving')
  return compact ? '…' : t('animation.step.queued')
}
