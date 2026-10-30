import { Download, ExternalLink, FileCode2, LoaderCircle, PencilLine, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AnimationCodeEditor } from '@/components/animation/AnimationCodeEditor'
import { AnimationGenerating } from '@/components/animation/AnimationGenerating'
import { AnimationPreview } from '@/components/animation/AnimationPreview'
import { FormatSelect } from '@/components/animation/FormatSelect'
import { Button } from '@/components/ui/Button'
import { APP_PATH } from '@/config/site'
import { DOWNLOAD_LINK_CLASS } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import { effectiveOptions, useVideoChoice, videoUrlFor, type VideoChoice } from '@/lib/videoFormats'
import { useRenderStore, type RenderPhase } from '@/store/animationRender'

/** รอพิมพ์หยุดเท่านี้ก่อนรีเฟรชตัวอย่าง ไม่งั้น iframe โหลดใหม่ทุกตัวอักษร */
const PREVIEW_DELAY_MS = 250

/** โค้ดเปลี่ยนทีละเยอะขนาดนี้ (วางโค้ด ล้างโค้ด) ถือว่าไม่ได้พิมพ์อยู่ รีเฟรชตัวอย่างทันที */
const INSTANT_CHANGE_CHARS = 100

/** ลิงก์ที่หน้าตาเหมือน Button แบบ secondary (ใส่ปุ่มไว้ในลิงก์ไม่ได้) */
const SECONDARY_LINK_CLASS =
  'flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-muted'

/**
 * แท็บ render โค้ด: ซ้ายวางโค้ด HTML ขวาเป็นผล (ตัวอย่างสดระหว่างแก้ ความคืบหน้าตอน render แล้ววิดีโอที่ได้)
 * เลือกชนิดไฟล์แล้วกดดาวน์โหลด render ด้วยเครื่องเดียวกับคลิปที่ AI สร้าง (1080p 60 fps 10 วินาที) ไม่ใช้ AI
 * เสร็จแล้วดาวน์โหลดให้เอง
 */
export function AnimationRenderTab() {
  const { t } = useTranslation()
  const { html, filename, seconds, phase, cancelling, setHtml, setFilename, setSeconds, render, resume, reset, cancel } =
    useRenderStore()
  const [preview, setPreview] = useState(html)
  const [choice, setChoice] = useVideoChoice()
  const working = phase.kind === 'working'

  useEffect(resume, [resume])

  useEffect(() => {
    const instant = !html.trim() || Math.abs(html.length - preview.length) >= INSTANT_CHANGE_CHARS
    const timer = setTimeout(() => setPreview(html), instant ? 0 : PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [html, preview.length])

  return (
    <div className="space-y-6">
      {/* ชื่อไฟล์อยู่บนสุดเต็มความกว้าง ช่องโค้ดกับ Result จะได้เริ่มที่ระดับเดียวกัน */}
      <input
        value={filename}
        onChange={(event) => setFilename(event.target.value)}
        placeholder={t('animation.render.namePlaceholder')}
        aria-label={t('animation.render.name')}
        disabled={working}
        className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] shadow-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
      />
      {/*
        สองคอลัมน์สูงเท่ากัน (แถวสูงตาม Result ช่องโค้ดยืดเต็มคอลัมน์) และเลื่อนไปพร้อมกับหน้า ไม่มีฝั่งไหนค้างอยู่
        จอแคบเรียงบนลงล่าง ช่องโค้ดสูงอย่างน้อย 20rem
      */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col">
          {/*
            ช่องโค้ดวางแบบ absolute ความยาวโค้ดจึงไม่ดันแถวให้สูงขึ้น แถวสูงเท่า Result
            โค้ดยาวกว่านั้นเลื่อนดูในช่อง
          */}
          <div className="relative min-h-[20rem] flex-1 lg:min-h-0">
            <AnimationCodeEditor
              value={html}
              onChange={setHtml}
              placeholder={t('animation.render.codePlaceholder')}
              ariaLabel={t('animation.render.code')}
              disabled={working}
              className="absolute inset-0 h-auto resize-none"
            />
          </div>
        </section>

        <aside className="min-w-0 space-y-3">
          <Result
            phase={phase}
            preview={preview}
            choice={choice}
            onEdit={reset}
            onCancel={cancel}
            cancelling={cancelling}
          />
        </aside>
      </div>

      {/* แถบล่างเต็มความกว้าง เลือกไฟล์แล้วกดดาวน์โหลด ระหว่าง render และหลังเสร็จ Result มีปุ่มของตัวเอง */}
      {phase.kind === 'idle' || phase.kind === 'failed' ? (
        <section className="border-t border-border pt-4">
          {/* ทุกช่องกับปุ่มเรียงเป็นแถวเดียว จอแคบขึ้นบรรทัดใหม่เอง (FormatSelect แบบ inline) */}
          <FormatSelect
            value={choice}
            onChange={setChoice}
            seconds={{ value: seconds, onChange: setSeconds, hint: t('animation.render.secondsHint') }}
            inline
            actions={
              <div className="flex gap-2">
                <Button variant="primary" className="flex-1" onClick={() => render(choice)} disabled={!html.trim()}>
                  <Download className="size-4" aria-hidden />
                  {t('animation.download')}
                </Button>
                <Button onClick={() => setHtml('')} disabled={!html} title={t('animation.render.clear')}>
                  <Trash2 className="size-4" aria-hidden />
                  {t('animation.render.clear')}
                </Button>
              </div>
            }
          />
          <p className="mt-1 text-[11.5px] text-subtle-foreground">{t('animation.render.hint')}</p>
        </section>
      ) : null}
    </div>
  )
}

function Result({
  phase,
  preview,
  choice,
  onEdit,
  onCancel,
  cancelling,
}: {
  phase: RenderPhase
  preview: string
  choice: VideoChoice
  onEdit: () => void
  onCancel: () => void
  cancelling: boolean
}) {
  const { t } = useTranslation()

  if (phase.kind === 'working') {
    const job = phase.job
    const percent =
      job?.stage === 'rendering' && job.framesTotal ? ((job.framesDone ?? 0) / job.framesTotal) * 100 : undefined
    const label =
      job?.stage === 'queued'
        ? t('animation.step.queued')
        : job?.stage === 'saving'
          ? t('animation.step.saving')
          : percent !== undefined
            ? t('animation.step.renderingPercent', { percent: Math.floor(percent) })
            : t('animation.step.rendering')
    return (
      <>
        <AnimationGenerating label={label} percent={percent ?? 0} />
        <Button variant="danger" className="w-full" onClick={onCancel} disabled={cancelling}>
          {cancelling ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
          {cancelling ? t('animation.cancelling') : t('animation.cancel')}
        </Button>
      </>
    )
  }

  if (phase.kind === 'done') {
    const result = phase.result
    const url = videoUrlFor(result, phase.choice)
    return (
      <>
        {/* ProRes เบราว์เซอร์ส่วนใหญ่เล่นไม่ได้ แสดงตัวอย่างจากโค้ดแทน */}
        {result.videoUrl ? (
          <video
            src={result.videoUrl}
            className="aspect-video w-full rounded-xl border border-border bg-black"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : (
          <AnimationPreview html={preview} title={t('animation.previewTitle')} transparent={phase.choice.format === 'prores_alpha'}
            background={effectiveOptions(phase.choice).background}
          />
        )}
        {url ? (
          <a href={url} className={cn(DOWNLOAD_LINK_CLASS, 'flex h-9 w-full')}>
            <Download className="size-4" aria-hidden />
            {t('animation.download')} · {t(`animation.format.${phase.choice.format}`)} · {t('animation.format.fps', { fps: phase.choice.fps })}
          </a>
        ) : null}
        <a href={result.htmlDownloadUrl} className={SECONDARY_LINK_CLASS}>
          <FileCode2 className="size-4" aria-hidden />
          {t('animation.downloadHtml')}
        </a>
        <Link to={`${APP_PATH}/animation/${result.id}`} className={SECONDARY_LINK_CLASS}>
          <ExternalLink className="size-4" aria-hidden />
          {t('animation.open')}
        </Link>
        <Button variant="ghost" className="w-full" onClick={onEdit}>
          <PencilLine className="size-4" aria-hidden />
          {t('animation.render.editAgain')}
        </Button>
      </>
    )
  }

  return (
    <>
      {phase.kind === 'failed' ? (
        <div className="rounded-xl border border-danger bg-danger-soft p-3 text-[13px] text-danger">{phase.message}</div>
      ) : null}
      {preview.trim() ? (
        <AnimationPreview html={preview} title={t('animation.previewTitle')} transparent={choice.format === 'prores_alpha'}
          background={effectiveOptions(choice).background}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border-strong bg-card px-6 text-center text-[13px] text-subtle-foreground">
          {t('animation.render.empty')}
        </div>
      )}
    </>
  )
}
