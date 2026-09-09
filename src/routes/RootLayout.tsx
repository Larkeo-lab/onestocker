import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react'

import { AuthBridge } from '@/components/auth/AuthBridge'
import { GenerateProvider } from '@/components/generate/GenerateProvider'
import { AppShell } from '@/components/layout/AppShell'
import { env } from '@/lib/env'

/**
 * layout ของทุกหน้าที่ต้องล็อกอิน
 *
 * วาง provider ไว้ที่นี่ ไม่ใช่ในหน้า Generate เพราะ layout route
 * ไม่ถูกถอดออกตอนผู้ใช้สลับหน้า รูปและผลลัพธ์ที่ทำค้างไว้จึงไม่หาย
 *
 * ด่านนี้เป็นแค่การกันหน้าจอ ฝั่ง Go ตรวจ token ของทุกคำขออีกชั้นอยู่แล้ว
 * (internal/shared/middleware/auth.go) จะข้ามด่านนี้ไปก็ไม่ได้ข้อมูลอยู่ดี
 */
export function RootLayout() {
  // ตอน dev ที่ข้ามล็อกอิน ไม่มี ClerkProvider อยู่เลย จึงใช้
  // <SignedIn> หรือ AuthBridge ไม่ได้ ต้องเข้าแอปตรง ๆ
  if (env.authDevBypass) {
    return (
      <GenerateProvider>
        <AppShell />
      </GenerateProvider>
    )
  }

  return (
    <>
      <SignedIn>
        <AuthBridge>
          <GenerateProvider>
            <AppShell />
          </GenerateProvider>
        </AuthBridge>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  )
}
