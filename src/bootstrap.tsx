// ต้องมาก่อนทุกอย่าง คอมโพเนนต์ตัวแรกที่ render จะได้มีคำแปลพร้อมใช้
import '@/config/i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { LocalizedClerkProvider } from '@/components/auth/LocalizedClerkProvider'
import { env } from '@/lib/env'

import App from './App.tsx'

/*
  เปิดตัวแอปที่ต้องล็อกอิน

  แยกออกมาจาก main.tsx เพื่อให้ถูกโหลดด้วย import() เฉพาะตอนไม่ได้อยู่หน้าแรก
  คนที่เปิดหน้า landing จึงไม่ต้องโหลด Clerk, react-router และโค้ดทั้งแอปมาด้วย
*/

if (!env.authDevBypass && !env.clerkPublishableKey) {
  throw new Error(
    'ไม่พบ VITE_CLERK_PUBLISHABLE_KEY — คัดลอก .env.example เป็น .env แล้วเติมค่า',
  )
}

if (env.authDevBypass) {
  console.warn(
    'ข้ามหน้าล็อกอินอยู่ (VITE_AUTH_DEV_BYPASS=true) — ฝั่ง Go ต้องตั้ง AUTH_DEV_BYPASS=true ด้วย',
  )
}

// ตอนข้ามล็อกอินไม่ห่อด้วย ClerkProvider เลย เพราะ Clerk จะพยายาม
// ต่อไปหาเซิร์ฟเวอร์ของตัวเองแล้วล้มเหลว ทำให้ทั้งแอปค้าง
const tree = env.authDevBypass ? (
  <App />
) : (
  <LocalizedClerkProvider>
    <App />
  </LocalizedClerkProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{tree}</StrictMode>,
)
