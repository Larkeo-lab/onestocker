import { Download, Film, LoaderCircle, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { DOWNLOAD_LINK_CLASS } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import { useClipVideo, useVideoStore, type VideoState } from '@/store/animationVideo'
import type { AnimationResult } from '@/types/animation'

/**
 * ปุ่มดาวน์โหลด MP4 ของคลิปหนึ่ง: render แล้วเป็นลิงก์ดาวน์โหลด ยังไม่ render กดแล้ว render ก่อนแล้วดาวน์โหลดให้เอง
 * ระหว่าง render แสดงความคืบหน้าในปุ่ม ใช้ทั้งในหน้าสร้าง ประวัติ และหน้ารายการเดียว
 *
 * compact = การ์ดในประวัติ ข้อความสั้น
 */
export function VideoDownloadButton({ item: original, compact = false }: { item: AnimationResult; compact?: boolean }) {
  const { t } = useTranslation()
  const render = useVideoStore((store) => store.render)
  const { item, state } = useClipVideo(original)
  const size = `${item.height}p ${item.fps}fps`

  if (item.videoDownloadUrl) {
    return (
      <a href={item.videoDownloadUrl} className={cn(DOWNLOAD_LINK_CLASS, 'flex h-9 w-full', compact && 'h-8')}>
        <Download className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
        {compact ? 'MP4' : t('animation.downloadVideo', { size })}
      </a>
    )
  }

  if (state?.kind === 'rendering') {
    return (
      <Button variant="primary" size={compact ? 'sm' : undefined} className="w-full" disabled>
        <LoaderCircle className={cn('animate-spin', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        {renderingLabel(t, state, compact)}
      </Button>
    )
  }

  return (
    <div className="w-full space-y-1.5">
      <Button
        variant="primary"
        size={compact ? 'sm' : undefined}
        className="w-full"
        onClick={() => render(item.id)}
        title={t('animation.video.hint')}
      >
        {state?.kind === 'failed' ? (
          <RotateCcw className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
        ) : (
          <Film className={compact ? 'size-3.5' : 'size-4'} aria-hidden />
        )}
        {compact ? 'MP4' : t('animation.video.render', { size })}
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
