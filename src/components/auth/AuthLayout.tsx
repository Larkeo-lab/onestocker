import { Outlet } from 'react-router-dom'

import { AuthWordmark } from './AuthWordmark'

/**
 * หน้าเข้าสู่ระบบไม่มี sidebar เพราะยังไม่ได้ล็อกอิน
 *
 * ไม่มีช่องเลือกภาษา — หน้านี้ใช้ภาษาที่ผู้ใช้เลือกไว้แล้วจากหน้า landing หรือในตัวแอป
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      {/*
        ชื่อแอปแบบตัวหนังสือมี animation แทนรูปโลโก้
        ระหว่าง Clerk โหลด หน้านี้มีแค่ชื่อแอปอย่างเดียว คลื่นของตัวอักษรจึงบอกว่ากำลังโหลด
      */}
      <AuthWordmark />

      <Outlet />
    </div>
  )
}
