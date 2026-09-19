import { Download, LoaderCircle, Maximize2, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ResultPreview } from '@/components/removeBg/ResultPreview'
import { Button } from '@/components/ui/Button'
import { useImageViewer } from '@/hooks/useImageViewer'
import { DOWNLOAD_LINK_CLASS } from '@/lib/removeBg'

import { ImageViewer, type DisplayFiles } from './ImageViewer'

/** ปุ่มยืนยันลบกลับเป็นปุ่มลบธรรมดาเองถ้าไม่กดยืนยันภายในเวลานี้ */
const CONFIRM_RESET_MS = 4000

/**
 * การ์ดของรูปหนึ่งรูปในคลังรูป ใช้ทั้งผลลัพธ์ลบพื้นหลังและอัปสเกล ดาวน์โหลดซ้ำหรือลบทิ้งได้
 *
 * onDelete ต้องลบและสั่งโหลดรายการใหม่ให้เสร็จก่อนคืนค่า การ์ดหายไปเองตอนรายการใหม่มาถึง
 */
export function LibraryItemCard({
  viewerId,
  previewUrl,
  transparent,
  filename,
  width,
  height,
  details,
  chips,
  downloadUrl,
  display,
  onDelete,
}: {
  /** ไม่ซ้ำกันในหน้า ใช้เปิดหน้าดูรูปเต็มจอของการ์ดนี้ เช่น "remove_bg/<id>" */
  viewerId: string
  previewUrl: string | null
  /** true = วางรูปย่อบนลายตาราง ให้เห็นส่วนที่โปร่งใส */
  transparent: boolean
  filename: string
  /** ขนาดของไฟล์เต็ม ใช้ตอนเปิดดูเต็มจอ */
  width: number
  height: number
  /** บรรทัดรายละเอียด เช่น ขนาดภาพ ขนาดไฟล์ วันที่ */
  details: ReactNode
  chips: ReactNode
  downloadUrl: string | null
  /** ไฟล์ขนาดดูบนจอ หน้าดูรูปแสดงไฟล์นี้ก่อนไฟล์เต็ม ไม่มีใช้ไฟล์เต็ม */
  display?: DisplayFiles | null
  onDelete: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()
  const viewer = useImageViewer(viewerId)

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
  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    setError(undefined)
    try {
      await onDelete()
    } catch {
      setError(t('library.deleteFailed'))
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <ResultPreview src={previewUrl} format={transparent ? 'png' : 'jpg'} onOpen={viewer.show} />

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-[13px] font-medium" title={filename}>
          {filename}
        </p>
        <p className="truncate text-[11.5px] text-subtle-foreground tabular-nums">{details}</p>
        <div className="flex flex-wrap gap-1">{chips}</div>

        {error ? (
          <p className="flex items-start gap-1.5 text-[12px] text-danger">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex gap-2 pt-1.5">
          {/* ระหว่างรอยืนยันซ่อนปุ่มดาวน์โหลด ให้ปุ่มยืนยันเต็มแถว การ์ดแคบบนมือถือจะได้ไม่ล้น */}
          {confirming ? null : downloadUrl ? (
            <a href={downloadUrl} className={DOWNLOAD_LINK_CLASS}>
              <Download className="size-3.5" aria-hidden />
              {t('removeBg.download')}
            </a>
          ) : (
            <p className="flex-1 self-center text-[11.5px] text-subtle-foreground">{t('library.linkMissing')}</p>
          )}

          {confirming ? null : (
            <Button
              size="sm"
              onClick={viewer.show}
              aria-label={t('viewer.open')}
              title={t('viewer.open')}
            >
              <Maximize2 className="size-3.5" aria-hidden />
            </Button>
          )}

          <Button
            size="sm"
            variant="danger"
            onClick={() => void handleDelete()}
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

      {viewer.open ? (
        <ImageViewer
          previewUrl={previewUrl}
          fullUrl={downloadUrl}
          display={display}
          // ไฟล์ที่โหลดไว้ล่วงหน้า (lib/preload) ใช้ key เดียวกับ id ของหน้าดูรูป
          preloadKey={viewerId}
          width={width}
          height={height}
          transparent={transparent}
          filename={filename}
          details={details}
          chips={chips}
          onClose={viewer.close}
        />
      ) : null}
    </li>
  )
}
