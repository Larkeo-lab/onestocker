import { useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Play, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { VideoDownloadButton } from '@/components/animation/VideoDownloadButton'
import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { APP_PATH } from '@/config/site'
import { deleteAnimation } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { useClipVideo } from '@/store/animationVideo'
import type { AnimationResult } from '@/types/animation'

/** ปุ่มยืนยันลบกลับเป็นปุ่มลบธรรมดาเองถ้าไม่กดยืนยันภายในเวลานี้ (เท่ากับ LibraryItemCard) */
const CONFIRM_RESET_MS = 4000

/**
 * แอนิเมชันหนึ่งรายการในประวัติ กดแล้วไปหน้าของรายการนั้น (/animation/:id)
 * render MP4 แล้ววิดีโอเล่นวนเองตอนอยู่บนจอ ยังไม่ render แสดงภาพปกที่ถ่ายจากโค้ด ปุ่ม MP4 render ให้แล้วดาวน์โหลด
 *
 * ลบสองจังหวะแบบเดียวกับคลังรูป ลบแล้วกู้คืนไม่ได้ เพราะไฟล์บน R2 ถูกลบไปด้วย
 */
export function AnimationHistoryCard({ item: original }: { item: AnimationResult }) {
  const { item } = useClipVideo(original)
  const to = `${APP_PATH}/animation/${item.id}`
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()
  const locale = intlLocale()
  const date = new Date(item.createdAt).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  useEffect(() => {
    if (!confirming || deleting) return
    const timer = setTimeout(() => setConfirming(false), CONFIRM_RESET_MS)
    return () => clearTimeout(timer)
  }, [confirming, deleting])

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    setError(undefined)
    try {
      await deleteAnimation(item.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
    } catch {
      setError(t('library.deleteFailed'))
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        to={to}
        className="relative block aspect-video w-full border-b border-border bg-black"
        aria-label={t('animation.open')}
      >
        {item.videoUrl ? (
          <PlayWhenVisible src={item.videoUrl} />
        ) : item.thumbUrl ? (
          <img src={item.thumbUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-[13px] font-medium" title={item.filename}>
          {item.filename}
        </p>
        <p className="truncate text-[11.5px] text-subtle-foreground tabular-nums">
          {`${item.height}p · ${item.seconds}s · ${date}`}
        </p>

        {error ? (
          <p className="flex items-start gap-1.5 text-[12px] text-danger">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2 pt-1.5">
          {confirming ? null : (
            <div className="flex-1">
              <VideoDownloadButton item={item} compact />
            </div>
          )}

          {confirming ? null : (
            <Link
              to={to}
              aria-label={t('animation.open')}
              title={t('animation.open')}
              className="flex h-8 items-center justify-center rounded-md border border-border bg-card px-2.5 transition-colors hover:border-border-strong hover:bg-muted"
            >
              <Play className="size-3.5" aria-hidden />
            </Link>
          )}

          <Button
            size="sm"
            variant="danger"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-label={confirming ? t('library.confirmDelete') : t('library.delete')}
            title={confirming ? t('library.confirmDelete') : t('library.delete')}
            className={confirming ? 'flex-1 border-danger bg-danger-soft' : undefined}
          >
            {deleting ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
            {confirming ? <span>{t('library.confirmDelete')}</span> : null}
          </Button>
        </div>
      </div>
    </li>
  )
}

/**
 * วิดีโอที่เล่นวนเองเฉพาะตอนอยู่บนจอ เลื่อนพ้นจอแล้วหยุด
 * ประวัติมีได้หลายสิบคลิป 1080p เล่นพร้อมกันทั้งหมดเครื่องลูกค้าจะหน่วงและเปลืองเน็ต
 */
function PlayWhenVisible({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.25 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [src])

  return <video ref={ref} src={src} className="size-full object-cover" muted loop playsInline preload="metadata" />
}
