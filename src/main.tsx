import { ClerkProvider } from '@clerk/clerk-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { env } from '@/lib/env'

import App from './App.tsx'
import './index.css'

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
  <ClerkProvider
    publishableKey={env.clerkPublishableKey}
    // Clerk ต้องรู้เส้นทางของหน้าเข้าสู่ระบบ เพื่อพาผู้ใช้ไปถูกที่
    // ตอน RedirectToSignIn ทำงาน — ต้องตรงกับ routes/router.tsx
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    afterSignOutUrl="/sign-in"
  >
    <App />
  </ClerkProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{tree}</StrictMode>,
)
