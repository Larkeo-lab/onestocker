import { useAuth } from '@clerk/clerk-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Loading } from '@/components/ui/AsyncState'
import { setAuthTokenGetter } from '@/lib/api'

/**
 * ส่ง token ของ Clerk ให้ชั้น API ใช้แนบไปกับทุกคำขอ
 *
 * ต้องลงทะเบียนตัวดึง token ระหว่าง render ไม่ใช่ใน effect
 * เพราะ effect ของลูกทำงานก่อน effect ของพ่อเสมอ ถ้าลงทะเบียนใน effect
 * คำขอชุดแรกของลูกจะออกไปโดยไม่มี Authorization แล้วโดน 401 ทันที
 */
export function AuthBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth()

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

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loading label="กำลังตรวจสอบสิทธิ์" />
      </div>
    )
  }

  return children
}
