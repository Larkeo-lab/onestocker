import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CHECKERBOARD_STYLE } from '@/lib/removeBg'
import type { RemoveBgFormat, RemoveBgQuality } from '@/types/removeBg'

/**
 * กรอบรูปด้านบนของการ์ด ใช้ทั้งรายการที่กำลังทำและในคลังรูป
 *
 * format = พื้นหลังของผลลัพธ์ PNG วางบนลายตารางให้เห็นส่วนที่โปร่งใส JPG วางบนพื้นขาว
 * ไม่ส่ง format = ยังเป็นรูปต้นฉบับ วางบนพื้นเทา
 */
export function ResultPreview({
  src,
  format,
  onOpen,
  children,
}: {
  src: string | null
  format?: RemoveBgFormat
  /** กดที่รูปเพื่อเปิดดูเต็มจอ ไม่ส่ง = กดไม่ได้ */
  onOpen?: () => void
  /** ชั้นที่ซ้อนทับรูป เช่นสถานะหรือปุ่มปิด อยู่เหนือพื้นที่กดเปิด */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div
      className="relative aspect-4/3 overflow-hidden border-b border-border bg-muted"
      style={format === 'png' ? CHECKERBOARD_STYLE : format === 'jpg' ? { backgroundColor: '#ffffff' } : undefined}
    >
      {src ? <img src={src} alt="" loading="lazy" className="size-full object-contain" /> : null}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('viewer.open')}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        />
      ) : null}
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

/** ป้ายระดับคุณภาพ HD มีสีให้เห็นต่างจากมาตรฐานทันที */
export function QualityChip({ quality }: { quality: RemoveBgQuality }) {
  const { t } = useTranslation()
  return (
    <span
      className={
        quality === 'hd'
          ? 'shrink-0 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[10.5px] font-medium text-primary'
          : 'shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground'
      }
    >
      {quality === 'hd' ? 'HD' : t('removeBg.qualityStandard')}
    </span>
  )
}
