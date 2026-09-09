import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState, type ReactNode } from 'react'

import { ErrorState, Loading } from '@/components/ui/AsyncState'

/**
 * นานแค่ไหนถึงจะถือว่า Clerk มีปัญหา
 *
 * ปกติโหลดเสร็จในหลักร้อยมิลลิวินาที ถ้าเกินนี้แปลว่าติดอะไรสักอย่าง
 */
const LOAD_TIMEOUT_MS = 8000

/**
 * รอให้ Clerk โหลดเสร็จก่อนค่อยปล่อยให้ลูกทำงาน
 *
 * ต้องกั้นไว้ที่ชั้นนี้ ไม่ใช่ข้างใน <SignedIn> เพราะตอน Clerk โหลดไม่ได้
 * ทั้ง <SignedIn> และ <SignedOut> จะไม่ render อะไรเลยทั้งคู่ — ผู้ใช้เห็น
 * หน้าว่างเปล่าที่ไม่มีอะไรบอกสาเหตุ และตัวจับเวลาที่อยู่ข้างในก็ไม่เคยทำงาน
 *
 * สาเหตุที่พบบ่อยคือโดเมนที่เปิดอยู่ไม่ตรงกับที่ตั้งไว้ใน Clerk instance
 * ซึ่ง Clerk จะตอบ 400 Invalid HTTP Origin header แล้วเงียบไป
 */
export function ClerkGate({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoaded])

  if (isLoaded) return children

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      {timedOut ? (
        <ErrorState
          message={
            `ต่อ Clerk ไม่ได้จาก ${window.location.origin} — ` +
            'โดเมนนี้ต้องถูกตั้งไว้ใน Clerk instance ที่คีย์นี้เป็นของมัน ' +
            'ถ้ากำลังทดสอบบนเครื่อง ให้ใช้คีย์ pk_test_ ของ instance development'
          }
          onRetry={() => window.location.reload()}
        />
      ) : (
        <Loading label="กำลังตรวจสอบสิทธิ์" />
      )}
    </div>
  )
}
