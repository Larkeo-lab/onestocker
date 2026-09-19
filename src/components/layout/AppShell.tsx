import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'

import i18n from '@/config/i18n'

import { PlansDialog } from '@/components/plans/PlansDialog'
import { QuotaDialog } from '@/components/quota/QuotaDialog'
import { WelcomeDialog } from '@/components/welcome/WelcomeDialog'
import { useMe } from '@/hooks/queries'
import { saveLanguage } from '@/lib/api'
import { isAppLanguage } from '@/config/languages'
import { usePlatformsStore } from '@/store/platforms'
import { useUiStore } from '@/store/ui'
import { useUsageStore } from '@/store/usage'

import { AppHeader } from './AppHeader'
import { OfflineBanner } from './OfflineBanner'
import { Sidebar } from './Sidebar'

/**
 * กลับมาที่แท็บถี่แค่ไหนก็ถามยอดใหม่ไม่เกินหนึ่งครั้งในช่วงนี้ หน่วยเป็นมิลลิวินาที
 *
 * สลับหน้าต่างไปมาครั้งเดียว เบราว์เซอร์ยิงทั้ง focus และ visibilitychange
 * ถ้าไม่กันไว้จะได้คำขอซ้อนกันสองสามครั้งติด
 */
const FOCUS_REFRESH_GAP = 10_000

/**
 * ถามยอดซ้ำทุกกี่มิลลิวินาทีระหว่างที่แท็บนี้เปิดค้างอยู่
 *
 * เครดิตเปลี่ยนได้โดยที่ผู้ใช้ไม่ได้ทำอะไรในแท็บนี้เลย — แอดมินอนุมัติการชำระ
 * รอบ 30 วันหมดอายุ หรือผู้ใช้กำลังสร้างงานอยู่ในอีกแท็บ
 * ป้ายบน header จึงต้องขยับเองโดยไม่ต้องรอให้สลับแท็บไปมา
 */
const USAGE_POLL_INTERVAL = 60_000

/**
 * โครงหน้าจอของทุกหน้าที่ต้องล็อกอิน
 *
 * เป็น layout route ของ react-router ทำให้ sidebar ไม่ถูก unmount
 * ตอนสลับหน้า งานที่ค้างอยู่ใน GenerateProvider จึงไม่หาย
 *
 * โปรไฟล์กับค่าระบบโหลดที่นี่ที่เดียว ทุกหน้าจึงไม่ต้องยิงซ้ำ
 */
export function AppShell() {
  const sidebarOpen = useUiStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const loadPlatformsFromBackend = usePlatformsStore((s) => s.loadFromBackend)
  const refreshUsage = useUsageStore((state) => state.refresh)

  const profile = useMe()

  /*
    บันทึกภาษาทุกครั้งที่ผู้ใช้เปลี่ยนในแอป อีเมลแจ้งเตือน (เช่นอนุมัติการชำระ) จะได้ตรงภาษา
    ตอนเปิดแอปไม่ต้องยิง /auth/me ส่งภาษามากับ header อยู่แล้ว
    บันทึกไม่สำเร็จไม่ต้องบอกผู้ใช้ ครั้งหน้าที่เปิดแอปจะถูกบันทึกผ่าน /auth/me เอง
  */
  useEffect(() => {
    function onLanguageChanged(language: string) {
      if (isAppLanguage(language)) void saveLanguage(language).catch(() => {})
    }
    i18n.on('languageChanged', onLanguageChanged)
    return () => i18n.off('languageChanged', onLanguageChanged)
  }, [])

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
    ถ้าดึงแค่ตอนเปิดแอป ตัวเลขเครดิตบน header จะค้างเป็นของเก่าจนกว่าจะรีเฟรชทั้งหน้า
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

    /*
      ถามซ้ำเป็นรอบระหว่างเปิดแท็บค้างไว้ ผู้ใช้หลายคนเปิดหน้านี้ทิ้งไว้ทั้งวัน
      ข้ามรอบที่แท็บถูกซ่อนอยู่ ไม่ต้องยิงถามให้เปลือง เพราะตอนกลับมาจะถูกถามใหม่อยู่แล้ว
    */
    const timer = setInterval(refreshIfStale, USAGE_POLL_INTERVAL)

    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('focus', refreshIfStale)
    }
  }, [refreshUsage])

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          profile={profile.data ?? null}
          onOpenNavigation={() => setSidebarOpen(true)}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      {/* อยู่นอก main เพราะเป็นชั้นลอยทับทั้งหน้าจอ ไม่ใช่เนื้อหาของหน้าไหน */}
      <QuotaDialog />
      <PlansDialog />
      <WelcomeDialog show={profile.data?.showWelcome === true} />
      <OfflineBanner />
    </div>
  )
}
