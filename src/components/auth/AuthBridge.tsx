import { useAuth } from '@clerk/clerk-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { setAuthTokenGetter } from '@/lib/api'

/**
 * นานแค่ไหนถึงจะถือว่า Clerk มีปัญหา
 *
 * ปกติโหลดเสร็จในหลักร้อยมิลลิวินาที ถ้าเกินนี้แปลว่าติดอะไรสักอย่าง
 * ที่พบบ่อยคือใช้คีย์ production เปิดจาก localhost ซึ่ง Clerk จะตอบ
 * 400 Invalid HTTP Origin header แล้วเงียบไปเฉย ๆ
 */
const LOAD_TIMEOUT_MS = 8000

/**
 * ส่ง token ของ Clerk ให้ชั้น API ใช้แนบไปกับทุกคำขอ
 *
 * ต้องลงทะเบียนตัวดึง token ระหว่าง render ไม่ใช่ใน effect
 * เพราะ effect ของลูกทำงานก่อน effect ของพ่อเสมอ ถ้าลงทะเบียนใน effect
 * คำขอชุดแรกของลูกจะออกไปโดยไม่มี Authorization แล้วโดน 401 ทันที
 */
export function AuthBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // เก็บตัวล่าสุดไว้ใน ref เพื่อให้ตัวที่ลงทะเบียนไปแล้วเป็นฟังก์ชันตัวเดิม
  // ไม่ต้องลงทะเบียนใหม่ทุกครั้งที่ Clerk สร้าง getToken ตัวใหม่
  const latest = useRef(getToken)
  useEffect(() => {
    latest.current = getToken
  }, [getToken])

  // ตัวตรวจเตือนว่าอ่าน ref ระหว่าง render แต่ที่นี่ไม่ได้อ่านจริง
  // — บรรทัดนี้แค่ส่งฟังก์ชันไปเก็บไว้ latest.current จะถูกอ่านตอนที่
  // axios เรียกใช้ทีหลัง ซึ่งเป็นนอกช่วง render แล้ว
  // oxlint-disable-next-line react/refs
  setAuthTokenGetter(() => latest.current())

  // ถ้า Clerk ไม่ยอมโหลด ต้องบอกผู้ใช้ว่าเกิดอะไรขึ้น
  // ปล่อยให้หมุนค้างหรือขึ้นหน้าว่างเปล่าไปเรื่อย ๆ หาสาเหตุไม่ได้เลย
  useEffect(() => {
    if (isLoaded) return
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoaded])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        {timedOut ? (
          <ErrorState
            message={
              'ต่อ Clerk ไม่ได้ — ถ้ากำลังเปิดจาก localhost ด้วยคีย์ production ' +
              'Clerk จะปฏิเสธ ให้ใช้คีย์ของ development instance ' +
              'หรือตั้ง VITE_AUTH_DEV_BYPASS=true เพื่อข้ามหน้าล็อกอินระหว่างพัฒนา'
            }
            onRetry={() => window.location.reload()}
          />
        ) : (
          <Loading label="กำลังตรวจสอบสิทธิ์" />
        )}
      </div>
    )
  }

  return children
}
