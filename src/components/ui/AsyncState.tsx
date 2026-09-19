import { LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { isOfflineError } from '@/lib/error'
import { useOnline } from '@/lib/network'

import { Button } from './Button'

/** ใช้ระหว่างรอข้อมูลจาก API */
export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-16 text-[13px] text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label ?? t('common.loading')}
    </div>
  )
}

/**
 * ใช้เมื่อโหลดข้อมูลไม่สำเร็จ
 * ต้องมีปุ่มลองใหม่เสมอ ไม่งั้นผู้ใช้ต้องรีเฟรชทั้งหน้าเพื่อลองอีกครั้ง
 *
 * ส่ง error มาด้วยถ้ามี — ถ้าล้มเพราะเน็ตหลุด จะแสดงเป็นสถานะออฟไลน์แทนกล่องสีแดง
 */
export function ErrorState({
  message,
  error,
  onRetry,
}: {
  message: string
  error?: unknown
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const online = useOnline()

  if (!online || isOfflineError(error)) return <OfflineState onRetry={onRetry} />

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/40 bg-danger-soft px-6 py-14 text-center">
      <TriangleAlert className="size-5 text-danger" aria-hidden />
      <p className="mt-3 max-w-md text-[13px] text-danger">{message}</p>
      {onRetry ? (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * ใช้เมื่อเน็ตหลุด ไม่ใช่ความผิดของผู้ใช้หรือเซิร์ฟเวอร์ จึงใช้สีกลาง ๆ ไม่ใช่สีแดง
 * กลับมาออนไลน์แล้วข้อมูลโหลดใหม่เอง (ดู OfflineBanner) ปุ่มลองใหม่มีไว้เผื่อไม่อยากรอ
 */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-14 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-3 text-[13.5px] font-semibold">{t('offline.title')}</p>
      <p className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
        {t('offline.description')}
      </p>
      {onRetry ? (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
