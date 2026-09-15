import {
  CloudUpload,
  Image as ImageIcon,
  Images,
  Lock,
  Plus,
  Shapes,
  TriangleAlert,
  Video,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { ACCEPT_ATTRIBUTE } from '@/lib/media'
import { cn } from '@/lib/utils'
import { VIDEO_MAX_SECONDS } from '@/lib/video'

type Format = {
  icon: LucideIcon
  label: string
  /** false = ยังไม่มี pipeline รองรับ แสดงไว้แต่ยังอัปไม่ได้ */
  supported: boolean
}

const FORMATS: Format[] = [
  { icon: ImageIcon, label: 'JPG, PNG, WEBP', supported: true },
  { icon: Shapes, label: 'SVG, EPS', supported: false },
  { icon: Video, label: 'MP4, MOV', supported: true },
]

export function Dropzone({
  count,
  maxAssets,
  notice,
  onFiles,
}: {
  /** จำนวนรูปที่อยู่ในรอบนี้แล้ว ใช้บอกว่าเหลือที่ว่างเท่าไร */
  count: number
  /** เพดานต่อรอบ มาจากเซิร์ฟเวอร์ผ่าน GenerateProvider */
  maxAssets: number
  /** ข้อความจาก provider เมื่อมีไฟล์ถูกข้าม */
  notice: string | null
  onFiles: (files: File[]) => void
}) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => inputRef.current?.click()
  const full = count >= maxAssets

  return (
    <section>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onFiles(Array.from(e.dataTransfer.files))
        }}
        // มีรูปแล้วให้กดผ่านปุ่มแทน กันกดโดนตอนเลื่อนดูผลลัพธ์
        onClick={count > 0 ? undefined : openPicker}
        className={cn(
          'rounded-2xl border-2 border-dashed px-6 transition-colors',
          count > 0 ? 'py-5' : 'cursor-pointer py-16 text-center',
          dragging
            ? 'border-primary bg-primary-soft'
            : cn(
                'border-border-strong bg-card',
                count === 0 && 'hover:border-primary/50',
              ),
        )}
      >
        {count > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <Images className="size-5 text-primary" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">
                  <Trans
                    i18nKey="dropzone.count"
                    values={{ count, max: maxAssets }}
                    components={{ count: <span className="tabular-nums" /> }}
                  />
                </p>
                <p className="mt-0.5 text-[12px] text-subtle-foreground">
                  {full
                    ? t('dropzone.full')
                    : t('dropzone.dropMore')}
                </p>
              </div>
            </div>

            <Button size="sm" onClick={openPicker} disabled={full}>
              <Plus className="size-3.5" aria-hidden />
              {t('dropzone.addImages')}
            </Button>
          </div>
        ) : (
          <>
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft">
              <CloudUpload className="size-7 text-primary" aria-hidden />
            </span>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              {t('dropzone.uploadTitle')}
            </h2>

            <p className="mt-2 text-[15px] text-muted-foreground">
              <Trans
                i18nKey="dropzone.dragOrBrowse"
                components={{
                  browse: (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openPicker()
                      }}
                      className="rounded-sm font-medium text-primary hover:underline"
                    />
                  ),
                }}
              />
            </p>

            <ul className="mt-7 flex flex-wrap justify-center gap-2.5">
              {FORMATS.map(({ icon: Icon, label, supported }) => (
                <li
                  key={label}
                  title={supported ? undefined : t('dropzone.notSupported')}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2 text-[13px]',
                    supported
                      ? 'border-border bg-muted text-muted-foreground'
                      : 'border-dashed border-border bg-transparent text-subtle-foreground',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {label}
                  {supported ? null : (
                    // ฟอนต์ mono ไม่มีอักษรไทย/ลาว ใช้กับทุกภาษาแล้วตัวอักษรจะถ่างห่างกัน
                    <span className="text-[10px] uppercase [&:lang(en)]:font-mono [&:lang(en)]:tracking-wide">
                      {t('dropzone.soon')}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-7 text-[13px] text-subtle-foreground">
              {t('dropzone.upTo', { max: maxAssets })}
              {' · '}
              {t('dropzone.videoLimit', { seconds: VIDEO_MAX_SECONDS })}
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          aria-label={t('dropzone.chooseImages')}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            // ล้างค่า เพื่อให้เลือกไฟล์เดิมซ้ำได้
            e.target.value = ''
            onFiles(files)
          }}
        />
      </div>

      {notice ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-[13px] text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        {t('dropzone.privacy')}
      </p>
    </section>
  )
}
