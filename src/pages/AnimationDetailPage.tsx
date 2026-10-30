import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileCode2, LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AnimationCode } from '@/components/animation/AnimationCode'
import { AnimationPreview } from '@/components/animation/AnimationPreview'
import { FormatSelect } from '@/components/animation/FormatSelect'
import { VideoDownloadButton } from '@/components/animation/VideoDownloadButton'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { CONTAINER } from '@/config/container'
import { intlLocale } from '@/config/i18n'
import { APP_PATH } from '@/config/site'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { MANUAL_MODEL, deleteAnimation, fetchAnimation } from '@/lib/api/animation'
import { errorMessage } from '@/lib/error'
import { SIGNED_URL_STALE_MS, queryKeys } from '@/lib/query'
import { cn } from '@/lib/utils'
import { effectiveOptions, useVideoChoice } from '@/lib/videoFormats'
import { useClipVideo, useVideoStore } from '@/store/animationVideo'
import type { AnimationResult } from '@/types/animation'

const LIST_PATH = `${APP_PATH}/animation`

/** ลิงก์ที่หน้าตาเหมือน Button แบบ secondary (เท่ากับในหน้าแอนิเมชัน) */
const SECONDARY_LINK_CLASS =
  'flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-muted'

/** ปุ่มยืนยันลบกลับเป็นปุ่มลบธรรมดาเองถ้าไม่กดยืนยันภายในเวลานี้ */
const CONFIRM_RESET_MS = 4000

/**
 * แอนิเมชันหนึ่งรายการจากประวัติ (/animation/:id) วิดีโอ คำบรรยาย โค้ด ดาวน์โหลด และลบ
 *
 * id อยู่ใน URL จึงแชร์ลิงก์หรือรีเฟรชแล้วกลับมาที่รายการเดิมได้ (ต้องเป็นของผู้ใช้คนนั้น)
 */
export function AnimationDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.animation.item(id),
    queryFn: () => fetchAnimation(id),
    staleTime: SIGNED_URL_STALE_MS,
    refetchInterval: SIGNED_URL_STALE_MS,
  })
  const item = query.data
  const [choice, setChoice] = useVideoChoice()
  // render MP4 ที่กดไว้ก่อนรีเฟรชหน้า
  const resumeVideos = useVideoStore((store) => store.resume)
  useEffect(resumeVideos, [resumeVideos])
  useDocumentTitle(item?.filename ?? t('nav.animation'))

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

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
    setDeleteError(undefined)
    try {
      await deleteAnimation(id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.animation.history })
      queryClient.removeQueries({ queryKey: queryKeys.animation.item(id) })
      navigate(LIST_PATH, { replace: true })
    } catch {
      setDeleteError(t('library.deleteFailed'))
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className={cn(CONTAINER.wide, 'space-y-6 py-6')}>
      <Link
        to={LIST_PATH}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('animation.back')}
      </Link>

      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} error={query.error} onRetry={() => void query.refetch()} />
      ) : item ? (
        <>
          <header>
            <h1 className="truncate text-[15px] leading-tight font-semibold tracking-tight" title={item.filename}>
              {item.filename}
            </h1>
            <p className="mt-1 text-[12.5px] text-muted-foreground tabular-nums">
              {new Date(item.createdAt).toLocaleString(intlLocale(), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </header>

          {/*
            จอกว้าง: ซ้ายคำบรรยายกับโค้ด ขวาวิดีโอกับปุ่ม (ติดอยู่ระหว่างเลื่อนอ่านโค้ดยาว ๆ)
            จอแคบ: วิดีโอขึ้นก่อน แล้วค่อยคำบรรยายกับโค้ด
          */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className="order-last min-w-0 lg:order-first">
              {/* คลิปที่ render จากโค้ดที่วางเองไม่มีคำบรรยาย */}
              {item.description ? (
                <>
                  <h2 className="mb-1.5 text-[13px] font-semibold">{t('animation.promptTitle')}</h2>
                  <p className="mb-5 rounded-lg bg-muted p-3 text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
                    {item.description}
                  </p>
                </>
              ) : null}
              {item.html ? <AnimationCode html={item.html} /> : null}
            </section>

            <aside className="min-w-0 space-y-2 lg:sticky lg:top-20">
              <ClipMedia item={item} transparent={choice.format === 'prores_alpha'} background={effectiveOptions(choice).background} />
              <FormatSelect value={choice} onChange={setChoice} clipSeconds={item.seconds} />
              <VideoDownloadButton item={item} choice={choice} />
              <a href={item.htmlDownloadUrl} className={SECONDARY_LINK_CLASS}>
                <FileCode2 className="size-4" aria-hidden />
                {t('animation.downloadHtml')}
              </a>
              <p className="text-[11.5px] text-subtle-foreground">
                {item.model === MANUAL_MODEL ? t('animation.manualModel') : t('animation.model', { model: item.model })}
              </p>
              <Button
                variant="danger"
                className={cn('mt-4 w-full', confirming && 'border-danger bg-danger-soft')}
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                {confirming ? t('library.confirmDelete') : t('library.delete')}
              </Button>
              {deleteError ? <p className="text-[12px] text-danger">{deleteError}</p> : null}
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** render MP4 แล้วเล่นวิดีโอ ยังไม่ render เล่นตัวอย่างสดจากโค้ด (ภาพเดียวกับที่จะได้ในวิดีโอ) */
function ClipMedia({
  item: original,
  transparent,
  background,
}: {
  item: AnimationResult
  transparent: boolean
  background: string
}) {
  const { t } = useTranslation()
  const { item } = useClipVideo(original)
  // แบบโปร่งใสหรือเปลี่ยนสีพื้นแสดงจากโค้ดเสมอ วิดีโอที่เล่นในหน้าเว็บเป็น MP4 พื้นหลังตามโค้ด
  if (item.videoUrl && !transparent && !background) {
    return (
      <video
        src={item.videoUrl}
        className="mb-3 aspect-video w-full rounded-xl border border-border bg-black"
        autoPlay
        loop
        muted
        playsInline
        controls
      />
    )
  }
  return item.html ? (
    <div className="mb-3 space-y-1.5">
      <AnimationPreview html={item.html} title={t('animation.previewTitle')} transparent={transparent} background={background} />
      <p className="text-[12px] text-subtle-foreground">{t('animation.previewDone')}</p>
    </div>
  ) : null
}
