import { WifiOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnline } from '@/lib/network'
import { queryClient } from '@/lib/query'
import { useUsageStore } from '@/store/usage'

/**
 * ถามเซิร์ฟเวอร์ซ้ำทุกกี่มิลลิวินาทีระหว่างที่ต่อ Wi-Fi อยู่แต่ออกเน็ตไม่ได้
 *
 * กรณีนี้เบราว์เซอร์ไม่ยิง event online ให้ตอนเน็ตกลับมา ต้องลองถามเองถึงจะรู้
 */
const PROBE_INTERVAL = 10_000

/**
 * แถบบอกสถานะออฟไลน์ ลอยอยู่ล่างจอทุกหน้าที่ต้องล็อกอิน
 *
 * กลับมาออนไลน์เมื่อไร ข้อมูลที่โหลดไม่สำเร็จระหว่างหลุดจะถูกโหลดใหม่เอง
 * ผู้ใช้ไม่ต้องไล่กดลองใหม่ทีละหน้า
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnline()
  const refreshUsage = useUsageStore((state) => state.refresh)

  const wasOnline = useRef(online)
  useEffect(() => {
    const reconnected = online && !wasOnline.current
    wasOnline.current = online
    if (!reconnected) return

    void queryClient.refetchQueries({
      type: 'active',
      predicate: (query) => query.state.status === 'error',
    })
    if (useUsageStore.getState().failed) void refreshUsage()
  }, [online, refreshUsage])

  useEffect(() => {
    // เบราว์เซอร์รู้ว่าหลุดจริง (ถอด Wi-Fi) จะยิง event online ให้เองตอนกลับมา ไม่ต้องถาม
    if (online || !navigator.onLine) return

    // ใช้คำถามที่ต้องมี token ด้วย เพราะบางครั้งเซิร์ฟเวอร์ต่อถึงแต่ Clerk ยังต่อไม่ได้
    // ถ้าถามเส้นที่ไม่ต้องล็อกอินจะนึกว่ากลับมาแล้ว ทั้งที่คำขอถัดไปยังโดน 401
    const timer = setInterval(() => void refreshUsage(), PROBE_INTERVAL)
    return () => clearInterval(timer)
  }, [online, refreshUsage])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {online ? null : (
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-medium text-muted-foreground shadow-lg">
          <WifiOff className="size-3.5 shrink-0" aria-hidden />
          {t('offline.banner')}
        </div>
      )}
    </div>
  )
}
