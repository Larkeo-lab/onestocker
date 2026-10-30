import { Check, Clapperboard, ExternalLink, FileCode2, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { AnimationCode } from '@/components/animation/AnimationCode'
import { AnimationGenerating } from '@/components/animation/AnimationGenerating'
import { AnimationHistoryCard } from '@/components/animation/AnimationHistoryCard'
import { AnimationPreview } from '@/components/animation/AnimationPreview'
import { AnimationRenderTab } from '@/components/animation/AnimationRenderTab'
import { VideoDownloadButton } from '@/components/animation/VideoDownloadButton'
import { HistorySection } from '@/components/library/HistorySection'
import { Button } from '@/components/ui/Button'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useAnimationHistory } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ANIMATION_ACCEPT, ANIMATION_MAX_CLIPS, ANIMATION_MAX_MB } from '@/lib/api/animation'
import { formatBytes } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import { useAnimationStore, type AnimationPhase as Phase } from '@/store/animation'
import { useVideoStore } from '@/store/animationVideo'
import type { AnimationStage } from '@/types/animation'

/**
 * สร้างแอนิเมชันจากวิดีโอตัวอย่าง: อัปวิดีโอแล้วรอ เซิร์ฟเวอร์ทำต่อจนได้ MP4 (ดู feature animation ฝั่ง Go)
 *
 * งานอยู่ใน store/animation ไปหน้าอื่นแล้วกลับมายังเห็นงานเดิม รีเฟรชหน้าก็ถามสถานะต่อ
 * แท็บที่สอง (?tab=render) วางโค้ด HTML เองแล้ว render เป็น MP4 ไม่ผ่าน AI (AnimationRenderTab)
 * ด้านล่างเป็นประวัติ กดรายการไหนไปหน้าของรายการนั้น (AnimationDetailPage)
 */

const NO_HIDDEN: ReadonlySet<string> = new Set()

/** ลิงก์ที่หน้าตาเหมือน Button แบบ secondary (ใส่ปุ่มไว้ในลิงก์ไม่ได้) */
const SECONDARY_LINK_CLASS =
  'flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-muted'

/**
 * ลำดับขั้นที่แสดง fixing กับ saving (ถ่ายภาพปก บันทึก) รวมอยู่ในขั้นตรวจ
 * ไม่มีขั้น render แล้ว ได้โค้ดก็ดูตัวอย่างได้เลย render MP4 ตอนกดดาวน์โหลดทีละคลิป (VideoDownloadButton)
 */
const STEPS = ['upload', 'analyzing', 'coding', 'checking'] as const
type Step = (typeof STEPS)[number]

function currentStep(phase: Phase): Step {
  if (phase.kind === 'uploading') return 'upload'
  const stage: AnimationStage | undefined = phase.kind === 'working' ? phase.job?.stage : undefined
  if (stage === 'analyzing' || stage === 'coding') return stage
  return stage ? 'checking' : 'analyzing'
}

export function AnimationPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.animation'))
  const { phase, select, generate, resume, reset } = useAnimationStore()
  const history = useAnimationHistory()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'render' ? 'render' : 'video'
  const tabs = [
    { id: 'video', label: t('animation.tabVideo') },
    { id: 'render', label: t('animation.tabRender') },
  ] as const
  const [dragging, setDragging] = useState(false)
  // จำนวนคลิปที่จะสร้าง กับคลิปที่เลือกดูตอนเสร็จแล้ว
  const [count, setCount] = useState(1)
  const [picked, setPicked] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = phase.kind === 'uploading' || phase.kind === 'working'

  // งานที่ส่งไว้ก่อนรีเฟรชหน้า (สร้างแอนิเมชัน และ render MP4 ที่กดไว้)
  const resumeVideos = useVideoStore((store) => store.resume)
  useEffect(resume, [resume])
  useEffect(resumeVideos, [resumeVideos])

  // ระหว่างทำ แสดงผลของขั้นที่เสร็จแล้วก่อน ล้มเหลวก็ยังเห็นโค้ดที่ได้
  const partial = phase.kind === 'working' || phase.kind === 'failed' ? phase.job : undefined
  const result = phase.kind === 'done' ? (phase.results[picked] ?? phase.results[0]) : undefined
  const description = result ? result.description : partial?.description
  const html = result ? result.html : partial?.html
  // ทำหลายคลิป บอกว่าอยู่คลิปที่เท่าไร
  const clip = phase.kind === 'working' && (phase.job?.count ?? 1) > 1 ? phase.job : undefined
  const clipLabel = clip ? t('animation.clipProgress', { current: clip.current, count: clip.count }) : ''

  return (
    <div className={cn(CONTAINER.wide, 'space-y-8 py-6')}>
      <header>
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.animation')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('animation.description')}</p>
      </header>

      <div className="-mt-4 flex gap-1 border-b border-border" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setSearchParams(item.id === 'render' ? { tab: 'render' } : {}, { replace: true })}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
              tab === item.id
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* อยู่นอกกล่องวางไฟล์ ปุ่มเปลี่ยนวิดีโอหลังอัปแล้วจึงใช้ตัวเดียวกันได้ */}
      <input
        ref={inputRef}
        type="file"
        accept={ANIMATION_ACCEPT}
        className="hidden"
        aria-label={t('animation.choose')}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) select(file)
          event.target.value = ''
        }}
      />

      {tab === 'render' ? (
        <AnimationRenderTab />
      ) : phase.kind === 'idle' || (phase.kind === 'failed' && !phase.job) ? (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files[0]
            if (file) select(file)
          }}
          className={cn(
            'rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
            dragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-card',
          )}
        >
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
            <Clapperboard className="size-6 text-primary" aria-hidden />
          </span>
          <p className="mt-5 text-[17px] font-semibold tracking-tight">{t('animation.dropTitle')}</p>
          <p className="mt-1.5 text-[13px] text-subtle-foreground">
            {t('animation.dropHint', { size: ANIMATION_MAX_MB })}
          </p>
          {phase.kind === 'failed' && <p className="mt-3 text-[13px] text-danger">{phase.message}</p>}
          <Button className="mt-5" onClick={() => inputRef.current?.click()}>
            {t('animation.choose')}
          </Button>
        </div>
      ) : phase.kind === 'uploading' || phase.kind === 'ready' ? (
        // อัปเสร็จแล้วยังไม่สร้าง ให้ดูคลิปที่เลือกก่อน แล้วกดสร้างเอง
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <video
            src={phase.video.previewUrl}
            className="aspect-video w-full min-w-0 rounded-xl border border-border bg-black object-contain"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
          <aside className="space-y-4">
            <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
              <p className="truncate text-[13px] font-medium" title={phase.video.filename}>
                {phase.video.filename}
              </p>
              <p className="text-[11.5px] text-subtle-foreground tabular-nums">{formatBytes(phase.video.sizeBytes)}</p>
              {phase.kind === 'uploading' ? (
                <div className="space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${phase.percent}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-muted-foreground tabular-nums">
                    {t('animation.step.uploadPercent', { percent: phase.percent })}
                  </p>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-[12px] text-success">
                  <Check className="size-3.5" aria-hidden />
                  {t('animation.uploaded')}
                </p>
              )}
            </div>
            <label className="block space-y-1.5">
              <span className="text-[12.5px] font-medium">{t('animation.clipCount')}</span>
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {Array.from({ length: ANIMATION_MAX_CLIPS }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {t('animation.clips', { count: value })}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setPicked(0)
                generate(count)
              }}
              disabled={phase.kind !== 'ready'}
            >
              <Sparkles className="size-4" aria-hidden />
              {t('animation.generate')}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => inputRef.current?.click()}>
              <RefreshCw className="size-4" aria-hidden />
              {t('animation.changeVideo')}
            </Button>
            <p className="text-[11.5px] text-subtle-foreground">{t('animation.readyHint')}</p>
          </aside>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            {phase.kind === 'done' && phase.results.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
                {phase.results.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={result?.id === item.id}
                    onClick={() => setPicked(index)}
                    className={cn(
                      'h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors',
                      result?.id === item.id
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-card hover:border-border-strong hover:bg-muted',
                    )}
                  >
                    {t('animation.clipTab', { number: item.variant })}
                  </button>
                ))}
              </div>
            ) : null}
            {html ? (
              <AnimationPreview key={result?.id} html={html} title={t('animation.previewTitle')} />
            ) : busy ? (
              <AnimationGenerating
                step={currentStep(phase)}
                label={[clipLabel, stepLabel(t, currentStep(phase), phase)].filter(Boolean).join(' · ')}
                percent={stepPercent(phase)}
              />
            ) : (
              <div className="aspect-video w-full rounded-xl border border-border bg-card" />
            )}
            {html && (
              <p className="mt-2 text-[12px] text-subtle-foreground">
                {t(result ? 'animation.previewDone' : 'animation.previewNote')}
              </p>
            )}

            {description && (
              <div className="mt-5">
                <h2 className="text-[13px] font-semibold">{t('animation.promptTitle')}</h2>
                <p className="mt-1.5 rounded-lg bg-muted p-3 text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
                  {description}
                </p>
              </div>
            )}
            {html && (
              <div className="mt-5">
                <AnimationCode html={html} />
              </div>
            )}
          </section>

          <aside className="space-y-4">
            {phase.kind === 'failed' ? (
              <div className="rounded-xl border border-danger bg-danger-soft p-4 text-[13px] text-danger">
                {phase.message}
              </div>
            ) : (
              <ol className="space-y-2.5 rounded-xl border border-border bg-card p-4">
                {clipLabel ? <li className="text-[12px] font-semibold text-primary">{clipLabel}</li> : null}
                {STEPS.map((step, index) => {
                  const active = STEPS.indexOf(currentStep(phase))
                  const done = phase.kind === 'done' || index < active
                  const running = !done && index === active
                  return (
                    <li key={step} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full',
                          done ? 'bg-success text-white' : running ? 'bg-primary-soft text-primary' : 'bg-muted',
                        )}
                      >
                        {done ? (
                          <Check className="size-3" aria-hidden />
                        ) : running ? (
                          <span className="relative flex size-2">
                            <span className="absolute inset-0 rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
                            <span className="relative size-2 rounded-full bg-primary" />
                          </span>
                        ) : null}
                      </span>
                      <span className={cn(!done && !running && 'text-subtle-foreground')}>
                        {stepLabel(t, step, phase)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}

            {result && (
              <div className="space-y-2">
                <VideoDownloadButton item={result} />
                <a href={result.htmlDownloadUrl} className={SECONDARY_LINK_CLASS}>
                  <FileCode2 className="size-4" aria-hidden />
                  {t('animation.downloadHtml')}
                </a>
                <Link to={`${APP_PATH}/animation/${result.id}`} className={SECONDARY_LINK_CLASS}>
                  <ExternalLink className="size-4" aria-hidden />
                  {t('animation.open')}
                </Link>
                <p className="text-[11.5px] text-subtle-foreground">
                  {t('animation.model', { model: result.model })}
                </p>
              </div>
            )}

            {(phase.kind === 'done' || phase.kind === 'failed') && (
              <Button variant="ghost" className="w-full" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden />
                {t('animation.again')}
              </Button>
            )}
          </aside>
        </div>
      )}

      <HistorySection
        title={t('animation.historyTitle')}
        query={history}
        hide={NO_HIDDEN}
        renderItem={(item) => <AnimationHistoryCard key={item.id} item={item} />}
      />
    </div>
  )
}

/** ความคืบหน้าเป็นเปอร์เซ็นต์ของขั้นที่วัดได้ (อัปโหลด) ขั้นอื่นไม่มี */
function stepPercent(phase: Phase): number | undefined {
  return phase.kind === 'uploading' ? phase.percent : undefined
}

function stepLabel(t: ReturnType<typeof useTranslation>['t'], step: Step, phase: Phase): string {
  if (step === 'upload' && phase.kind === 'uploading') return t('animation.step.uploadPercent', { percent: phase.percent })
  if (step === 'checking' && phase.kind === 'working' && phase.job?.stage === 'fixing') return t('animation.step.fixing')
  if (step === 'checking' && phase.kind === 'working' && phase.job?.stage === 'saving') return t('animation.step.savingCode')
  return t(`animation.step.${step}`)
}
