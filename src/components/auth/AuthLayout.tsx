import { Outlet } from 'react-router-dom'

import { siteConfig } from '@/config/site'

/** หน้าเข้าสู่ระบบไม่มี sidebar เพราะยังไม่ได้ล็อกอิน */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      {/*
        ใช้โลโก้เต็มพร้อมตัวหนังสือ เพราะหน้านี้ไม่มีอย่างอื่นแข่งพื้นที่
        พื้นหลังโปร่งใส จึงอ่านออกทั้งโหมดมืดและสว่าง
      */}
      <img
        src="/logo/wordmark.png"
        alt={siteConfig.name}
        width={200}
        height={53}
        className="h-auto w-[200px] object-contain"
      />

      <Outlet />
    </div>
  )
}
