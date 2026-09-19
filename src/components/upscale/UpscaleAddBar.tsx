import { ImageUpscale, Images, Monitor } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { MAX_INPUT_MB, PICKER_ACCEPT } from '@/lib/upscale'
import { cn } from '@/lib/utils'

/**
 * ที่เพิ่มรูปของหน้าอัปสเกล ลากไฟล์มาวาง เลือกจากเครื่อง หรือเลือกจากคลังรูป
 * มีรูปแล้วยุบเหลือแถบเล็ก ปุ่มทั้งสองยังอยู่
 */
export function UpscaleAddBar({
  compact,
  onFiles,
  onOpenLibrary,
}: {
  compact: boolean
  onFiles: (files: File[]) => void
  onOpenLibrary: () => void
}) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const buttons = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button size={compact ? 'sm' : 'md'} onClick={() => inputRef.current?.click()}>
        <Monitor className="size-3.5" aria-hidden />
        {t('upscale.fromDevice')}
      </Button>
      <Button size={compact ? 'sm' : 'md'} onClick={onOpenLibrary}>
        <Images className="size-3.5" aria-hidden />
        {t('upscale.fromLibrary')}
      </Button>
    </div>
  )

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        onFiles(Array.from(event.dataTransfer.files))
      }}
      className={cn(
        'rounded-2xl border-2 border-dashed px-6 transition-colors',
        compact ? 'py-4' : 'py-12 text-center',
        dragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-card',
      )}
    >
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">{t('upscale.dropHint', { size: MAX_INPUT_MB })}</p>
          {buttons}
        </div>
      ) : (
        <>
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
            <ImageUpscale className="size-6 text-primary" aria-hidden />
          </span>
          <p className="mt-5 text-[17px] font-semibold tracking-tight">{t('upscale.dropTitle')}</p>
          <p className="mt-1.5 text-[13px] text-subtle-foreground">{t('upscale.dropHint', { size: MAX_INPUT_MB })}</p>
          <div className="mt-5">{buttons}</div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={PICKER_ACCEPT}
        className="hidden"
        aria-label={t('upscale.fromDevice')}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          // ล้างค่าเพื่อให้เลือกไฟล์เดิมซ้ำแล้วยังได้ onChange
          event.target.value = ''
        }}
      />
    </div>
  )
}
