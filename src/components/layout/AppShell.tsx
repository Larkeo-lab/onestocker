import { useEffect, useRef } from 'react'
import { PanelLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { QuotaDialog } from '@/components/quota/QuotaDialog'
import { siteConfig } from '@/config/site'
import { useAsync } from '@/hooks/useAsync'
import { fetchMe, fetchMeta } from '@/lib/api'
import { usePlatformsStore } from '@/store/platforms'
import { useUiStore } from '@/store/ui'
import { useUsageStore } from '@/store/usage'

import { Sidebar } from './Sidebar'

/**
 * กลับมาที่แท็บถี่แค่ไหนก็ถามยอดใหม่ไม่เกินหนึ่งครั้งในช่วงนี้ หน่วยเป็นมิลลิวินาที
 *
 * สลับหน้าต่างไปมาครั้งเดียว เบราว์เซอร์ยิงทั้ง focus และ visibilitychange
 * ถ้าไม่กันไว้จะได้คำขอซ้อนกันสองสามครั้งติด
 */
const FOCUS_REFRESH_GAP = 10_000

/**
 * โครงหน้าจอของทุกหน้าที่ต้องล็อกอิน
 *
 * เป็น layout route ของ react-router ทำให้ sidebar ไม่ถูก unmount
 * ตอนสลับหน้า งานที่ค้างอยู่ใน GenerateProvider จึงไม่หาย
 *
 * โปรไฟล์กับค่าระบบโหลดที่นี่ที่เดียว ทุกหน้าจึงไม่ต้องยิงซ้ำ
 */
export function AppShell() {
  const { t } = useTranslation()
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const loadPlatformsFromBackend = usePlatformsStore((s) => s.loadFromBackend)
  const refreshUsage = useUsageStore((state) => state.refresh)

  const profile = useAsync(fetchMe)
  const meta = useAsync(fetchMeta)

  useEffect(() => {
    loadPlatformsFromBackend()
  }, [loadPlatformsFromBackend])

  // ยอดใช้งานโหลดที่นี่ที่เดียวเหมือนโปรไฟล์ ตัวเลขจะได้ขึ้นตั้งแต่เปิดแอป
  // ไม่ใช่ตอนเข้าหน้า Generate ครั้งแรก
  useEffect(() => {
    void refreshUsage()
  }, [refreshUsage])

  /*
    ถามยอดใหม่ทุกครั้งที่ผู้ใช้กลับมาที่แท็บนี้

    ระดับแพ็กเกจกับเพดานเปลี่ยนได้จากหน้า admin โดยที่ผู้ใช้ไม่ได้ทำอะไรเลย
    ถ้าดึงแค่ตอนเปิดแอป ตัวเลขบน sidebar จะค้างเป็นของเก่าจนกว่าจะรีเฟรชทั้งหน้า
    ทั้งที่แอดมินอัปเกรดให้ไปแล้ว — จังหวะกลับมาที่แท็บคือจังหวะที่ผู้ใช้จะมองจริง
  */
  const lastFocusRefresh = useRef(0)
  useEffect(() => {
    function refreshIfStale() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastFocusRefresh.current < FOCUS_REFRESH_GAP) return
      lastFocusRefresh.current = now
      void refreshUsage()
    }

    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)
    return () => {
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('focus', refreshIfStale)
    }
  }, [refreshUsage])

  return (
    <div className="flex min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile.data ?? null}
        meta={meta.data ?? null}
        offline={Boolean(profile.error || meta.error)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t('nav.openNavigation')}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeft className="size-4" aria-hidden />
          </button>
          <span className="flex items-center gap-2">
            <img
              src="/logo/mark.png"
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0 object-contain"
            />
            <span className="text-[13px] font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </span>
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      {/* อยู่นอก main เพราะเป็นชั้นลอยทับทั้งหน้าจอ ไม่ใช่เนื้อหาของหน้าไหน */}
      <QuotaDialog />
    </div>
  )
}
