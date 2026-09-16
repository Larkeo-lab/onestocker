import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CHECKERBOARD_STYLE } from '@/lib/removeBg'
import type { RemoveBgFormat } from '@/types/removeBg'

/**
 * กรอบรูปด้านบนของการ์ด ใช้ทั้งรายการที่กำลังทำและในคลังรูป
 *
 * format = พื้นหลังของผลลัพธ์ PNG วางบนลายตารางให้เห็นส่วนที่โปร่งใส JPG วางบนพื้นขาว
 * ไม่ส่ง format = ยังเป็นรูปต้นฉบับ วางบนพื้นเทา
 */
export function ResultPreview({
  src,
  format,
  children,
}: {
  src: string | null
  format?: RemoveBgFormat
  /** ชั้นที่ซ้อนทับรูป เช่นสถานะหรือปุ่มปิด */
  children?: ReactNode
}) {
  return (
    <div
      className="relative aspect-4/3 overflow-hidden border-b border-border bg-muted"
      style={format === 'png' ? CHECKERBOARD_STYLE : format === 'jpg' ? { backgroundColor: '#ffffff' } : undefined}
    >
      {src ? <img src={src} alt="" loading="lazy" className="size-full object-contain" /> : null}
      {children}
    </div>
  )
}

/** ป้ายรูปแบบผลลัพธ์ เช่น "PNG · โปร่งใส" */
export function FormatChip({ format }: { format: RemoveBgFormat }) {
  const { t } = useTranslation()
  return (
    <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">
      {format.toUpperCase()} · {format === 'png' ? t('removeBg.transparent') : t('removeBg.whiteBackground')}
    </span>
  )
}
