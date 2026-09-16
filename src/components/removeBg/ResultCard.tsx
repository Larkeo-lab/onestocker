import { useQueryClient } from '@tanstack/react-query'
import { Download, LoaderCircle, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { deleteRemoveBgResult } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { DOWNLOAD_LINK_CLASS, formatBytes } from '@/lib/removeBg'
import type { BackgroundRemoval } from '@/types/removeBg'

import { FormatChip, ResultPreview } from './ResultPreview'

/** ปุ่มยืนยันลบกลับเป็นปุ่มลบธรรมดาเองถ้าไม่กดยืนยันภายในเวลานี้ */
const CONFIRM_RESET_MS = 4000

/** ผลลัพธ์หนึ่งรูปในคลังรูป ดาวน์โหลดซ้ำหรือลบทิ้งได้ */
export function ResultCard({ item }: { item: BackgroundRemoval }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    // กำลังลบอยู่ไม่ต้องย้อนกลับ ไม่งั้นปุ่มดาวน์โหลดโผล่กลับมาระหว่างรอ
    if (!confirming || deleting) return
    const timer = setTimeout(() => setConfirming(false), CONFIRM_RESET_MS)
    return () => clearTimeout(timer)
  }, [confirming, deleting])

  /*
    ลบสองจังหวะ กดครั้งแรกเปลี่ยนเป็นปุ่มยืนยัน กันลบโดยไม่ตั้งใจ
    ลบแล้วกู้คืนไม่ได้ เพราะไฟล์บน R2 ถูกลบไปด้วย
  */
  async function onDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    setError(undefined)
    try {
      await deleteRemoveBgResult(item.id)
      // การ์ดหายไปเองตอนรายการโหลดใหม่ ระหว่างนั้นค้างสถานะกำลังลบไว้
      await queryClient.invalidateQueries({ queryKey: queryKeys.removeBg.all })
    } catch {
      setError(t('library.deleteFailed'))
      setDeleting(false)
      setConfirming(false)
    }
  }

  const date = new Date(item.createdAt).toLocaleDateString(intlLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <ResultPreview src={item.previewUrl} format={item.format} />

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-[13px] font-medium" title={item.filename}>
          {item.filename}
        </p>
        <p className="truncate text-[11.5px] text-subtle-foreground tabular-nums">
          {item.width.toLocaleString(intlLocale())}×{item.height.toLocaleString(intlLocale())}
          {' · '}
          {formatBytes(item.sizeBytes)}
          {' · '}
          {date}
        </p>
        <div>
          <FormatChip format={item.format} />
        </div>

        {error ? (
          <p className="flex items-start gap-1.5 text-[12px] text-danger">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2 pt-1.5">
          {/* ระหว่างรอยืนยันซ่อนปุ่มดาวน์โหลด ให้ปุ่มยืนยันเต็มแถว การ์ดแคบบนมือถือจะได้ไม่ล้น */}
          {confirming ? null : item.url ? (
            <a href={item.url} className={DOWNLOAD_LINK_CLASS}>
              <Download className="size-3.5" aria-hidden />
              {t('removeBg.download')}
            </a>
          ) : (
            <p className="flex-1 self-center text-[11.5px] text-subtle-foreground">{t('library.linkMissing')}</p>
          )}

          <Button
            size="sm"
            variant="danger"
            onClick={() => void onDelete()}
            disabled={deleting}
            aria-label={confirming ? t('library.confirmDelete') : t('library.delete')}
            title={confirming ? t('library.confirmDelete') : t('library.delete')}
            className={confirming ? 'flex-1 border-danger bg-danger-soft' : undefined}
          >
            {deleting ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {confirming ? <span>{t('library.confirmDelete')}</span> : null}
          </Button>
        </div>
      </div>
    </li>
  )
}
