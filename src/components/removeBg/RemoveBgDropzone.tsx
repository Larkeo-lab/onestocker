import { Eraser, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { ACCEPTED_TYPES, MAX_UPLOAD_MB } from '@/lib/removeBg'
import { cn } from '@/lib/utils'

/**
 * กล่องวางรูปของหน้าลบพื้นหลัง
 *
 * ยังไม่มีรูปเป็นกล่องใหญ่กดได้ทั้งกล่อง มีรูปแล้วยุบเหลือแถบเล็กพร้อมปุ่มเพิ่มรูป
 * กันกดโดนตอนเลื่อนดูผลลัพธ์ แต่ยังลากไฟล์มาวางได้เหมือนเดิม
 */
export function RemoveBgDropzone({
  compact,
  onFiles,
}: {
  compact: boolean
  onFiles: (files: File[]) => void
}) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => inputRef.current?.click()
  // เครดิตต่อรูปต่างกันตามระดับคุณภาพ แสดงไว้ที่ตัวเลือกระดับหลังอัปรูปแล้ว
  const hint = t('removeBg.dropHint', { size: MAX_UPLOAD_MB })

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
      onClick={compact ? undefined : openPicker}
      className={cn(
        'rounded-2xl border-2 border-dashed px-6 transition-colors',
        compact ? 'py-4' : 'cursor-pointer py-14 text-center',
        dragging
          ? 'border-primary bg-primary-soft'
          : cn('border-border-strong bg-card', !compact && 'hover:border-primary/50'),
      )}
    >
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-muted-foreground">{hint}</p>
          <Button size="sm" onClick={openPicker}>
            <Plus className="size-3.5" aria-hidden />
            {t('removeBg.addMore')}
          </Button>
        </div>
      ) : (
        <>
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft">
            <Eraser className="size-6 text-primary" aria-hidden />
          </span>
          <p className="mt-5 text-[17px] font-semibold tracking-tight">{t('removeBg.dropTitle')}</p>
          <p className="mt-1.5 text-[13px] text-subtle-foreground">{hint}</p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        aria-label={t('removeBg.dropTitle')}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          // ล้างค่าเพื่อให้เลือกไฟล์เดิมซ้ำแล้วยังได้ onChange
          event.target.value = ''
        }}
      />
    </div>
  )
}
