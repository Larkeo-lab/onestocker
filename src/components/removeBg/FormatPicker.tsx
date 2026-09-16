import { useTranslation } from 'react-i18next'

import { CHECKERBOARD_STYLE } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import type { RemoveBgFormat } from '@/types/removeBg'

/** เลือกรูปแบบไฟล์ผลลัพธ์ มีผลตอนกดลบพื้นหลัง รูปที่สั่งไปแล้วไม่เปลี่ยนตาม */
export function FormatPicker({
  value,
  onChange,
}: {
  value: RemoveBgFormat
  onChange: (format: RemoveBgFormat) => void
}) {
  const { t } = useTranslation()

  const options: { value: RemoveBgFormat; label: string; hint: string }[] = [
    { value: 'png', label: t('removeBg.formatPng'), hint: t('removeBg.formatPngHint') },
    { value: 'jpg', label: t('removeBg.formatJpg'), hint: t('removeBg.formatJpgHint') },
  ]

  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-medium text-muted-foreground">
        {t('removeBg.formatLabel')}
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors',
                // radio ซ่อนอยู่ ต้องให้การ์ดแสดงวงโฟกัสแทนตอนใช้คีย์บอร์ด
                'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40',
                selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="remove-bg-format"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {/* ตัวอย่างพื้นหลังของผลลัพธ์ ลายตารางคือส่วนที่โปร่งใส */}
              <span
                aria-hidden
                className="size-10 shrink-0 rounded-md border border-border"
                style={option.value === 'png' ? CHECKERBOARD_STYLE : { backgroundColor: '#ffffff' }}
              />
              <span className="min-w-0">
                <span className={cn('block text-[13px] font-medium', selected && 'text-primary')}>
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
