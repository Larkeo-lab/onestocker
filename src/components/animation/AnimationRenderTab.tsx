import { Download, ExternalLink, FileCode2, Film, PencilLine, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AnimationCodeEditor } from '@/components/animation/AnimationCodeEditor'
import { AnimationGenerating } from '@/components/animation/AnimationGenerating'
import { AnimationPreview } from '@/components/animation/AnimationPreview'
import { Button } from '@/components/ui/Button'
import { APP_PATH } from '@/config/site'
import { DOWNLOAD_LINK_CLASS } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
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
 * render ด้วยเครื่องเดียวกับคลิปที่ AI สร้าง ได้ MP4 1080p 60 fps 10 วินาที ไม่ใช้ AI
 */
export function AnimationRenderTab() {
  const { t } = useTranslation()
  const { html, filename, phase, setHtml, setFilename, render, resume, reset } = useRenderStore()
  const [preview, setPreview] = useState(html)
  const working = phase.kind === 'working'

  useEffect(resume, [resume])

  useEffect(() => {
    const instant = !html.trim() || Math.abs(html.length - preview.length) >= INSTANT_CHANGE_CHARS
    const timer = setTimeout(() => setPreview(html), instant ? 0 : PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [html, preview.length])

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="min-w-0 space-y-3">
        <input
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          placeholder={t('animation.render.namePlaceholder')}
          aria-label={t('animation.render.name')}
          disabled={working}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] shadow-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
        />
        <AnimationCodeEditor
          value={html}
          onChange={setHtml}
          placeholder={t('animation.render.codePlaceholder')}
          ariaLabel={t('animation.render.code')}
          disabled={working}
        />
      </section>

      <aside className="min-w-0 space-y-3 lg:sticky lg:top-20">
        <Result phase={phase} preview={preview} onEdit={reset} />
        {/* ปุ่มอยู่ใต้ตัวอย่าง ดูผลแล้วกดได้เลย ระหว่าง render และหลังเสร็จ Result มีปุ่มของตัวเอง */}
        {phase.kind === 'idle' || phase.kind === 'failed' ? (
          <>
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1" onClick={render} disabled={!html.trim()}>
                <Film className="size-4" aria-hidden />
                {t('animation.render.start')}
              </Button>
              <Button onClick={() => setHtml('')} disabled={!html} title={t('animation.render.clear')}>
                <Trash2 className="size-4" aria-hidden />
                {t('animation.render.clear')}
              </Button>
            </div>
            <p className="text-[11.5px] text-subtle-foreground">{t('animation.render.hint')}</p>
          </>
        ) : null}
      </aside>
    </div>
  )
}

function Result({ phase, preview, onEdit }: { phase: RenderPhase; preview: string; onEdit: () => void }) {
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
    return <AnimationGenerating step="rendering" label={label} percent={percent ?? 0} />
  }

  if (phase.kind === 'done') {
    const result = phase.result
    return (
      <>
        <video
          src={result.videoUrl}
          className="aspect-video w-full rounded-xl border border-border bg-black"
          autoPlay
          loop
          muted
          playsInline
          controls
        />
        <a href={result.videoDownloadUrl} className={cn(DOWNLOAD_LINK_CLASS, 'flex h-9 w-full')}>
          <Download className="size-4" aria-hidden />
          {t('animation.downloadVideo', { size: `${result.height}p ${result.fps}fps` })}
        </a>
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
        <>
          <AnimationPreview html={preview} title={t('animation.previewTitle')} />
          <p className="text-[12px] text-subtle-foreground">{t('animation.render.previewNote')}</p>
        </>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border-strong bg-card px-6 text-center text-[13px] text-subtle-foreground">
          {t('animation.render.empty')}
        </div>
      )}
    </>
  )
}
