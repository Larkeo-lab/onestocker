import { ClerkProvider } from '@clerk/clerk-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { env } from '@/lib/env'

import App from './App.tsx'
import './index.css'

if (!env.clerkPublishableKey) {
  throw new Error(
    'ไม่พบ VITE_CLERK_PUBLISHABLE_KEY — คัดลอก .env.example เป็น .env แล้วเติมค่า',
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
