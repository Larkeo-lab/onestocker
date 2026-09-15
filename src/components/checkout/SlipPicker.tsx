import { ImageUp, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'

/** ต้องตรงกับ slipExtensions ใน server/internal/feature/payment/validation.go */
const SLIP_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * เพดานขนาดสลิปฝั่งหน้าเว็บ
 * เซิร์ฟเวอร์จำกัดไม่ได้ เพราะรูปอัปขึ้น R2 ตรง ๆ สลิปจากแอปธนาคารปกติไม่ถึง 1 MB
 */
const MAX_SLIP_MB = 10

/** เลือกรูปสลิปพร้อมตัวอย่าง ยังไม่อัป อัปตอนกดแจ้งชำระ */
export function SlipPicker({
  onChange,
  disabled,
}: {
  onChange: (file: File) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const [error, setError] = useState<string>()

  // ลิงก์ตัวอย่างสร้างตอนเลือกไฟล์ คืนหน่วยความจำของรูปเก่าเมื่อเปลี่ยนรูป และตอนออกจากหน้า
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  function pick(next: File | undefined) {
    if (!next) return
    if (!SLIP_TYPES.includes(next.type)) {
      setError(t('checkout.slipInvalidType'))
      return
    }
    if (next.size > MAX_SLIP_MB * 1024 * 1024) {
      setError(t('checkout.slipTooLarge', { size: MAX_SLIP_MB }))
      return
    }
    setError(undefined)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = URL.createObjectURL(next)
    setPreview(previewRef.current)
    onChange(next)
  }

  return (
    <div>
      <input
        id={inputId}
        type="file"
        accept={SLIP_TYPES.join(',')}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          pick(event.target.files?.[0])
          // ล้างค่าเพื่อให้เลือกไฟล์เดิมซ้ำแล้วยังได้ onChange
          event.target.value = ''
        }}
      />

      {preview ? (
        <div className="flex flex-wrap items-end gap-4">
          <img
            src={preview}
            alt=""
            className="max-h-72 w-auto max-w-full rounded-lg border border-border bg-muted object-contain"
          />
          <Button type="button" size="sm" disabled={disabled} onClick={() => document.getElementById(inputId)?.click()}>
            <ImageUp className="size-3.5" aria-hidden />
            {t('checkout.slipChange')}
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-card px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-soft"
        >
          <ImageUp className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-[13px] font-medium">{t('checkout.slipChoose')}</span>
          <span className="text-[12px] text-subtle-foreground">{t('checkout.slipHint', { size: MAX_SLIP_MB })}</span>
        </label>
      )}

      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-danger">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  )
}
