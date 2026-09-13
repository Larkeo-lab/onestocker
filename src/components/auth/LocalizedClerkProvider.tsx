import { ClerkProvider } from '@clerk/clerk-react'
import { enUS, thTH } from '@clerk/localizations'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '@/config/i18n'
import type { AppLanguage } from '@/config/languages'
import { APP_PATH } from '@/config/site'
import { env } from '@/lib/env'

/**
 * คำแปลของกล่องล็อกอินของ Clerk
 *
 * Clerk ยังไม่มีภาษาลาว จึงใช้อังกฤษแทน — ต้องส่ง enUS ไปตรง ๆ
 * ไม่ใช่ undefined เพราะถ้าเคยเป็นไทยอยู่ Clerk จะค้างภาษาไทยไว้
 */
const CLERK_LOCALIZATIONS: Record<AppLanguage, typeof enUS> = {
  en: enUS,
  th: thTH,
  lo: enUS,
}

export function LocalizedClerkProvider({ children }: { children: ReactNode }) {
  // เรียก hook เพื่อให้ re-render แล้วส่งคำแปลชุดใหม่ให้ Clerk ตอนเปลี่ยนภาษา
  useTranslation()

  return (
    <ClerkProvider
      publishableKey={env.clerkPublishableKey}
      localization={CLERK_LOCALIZATIONS[currentLanguage()]}
      // Clerk ต้องรู้เส้นทางของหน้าเข้าสู่ระบบ เพื่อพาผู้ใช้ไปถูกที่
      // ตอน RedirectToSignIn ทำงาน — ต้องตรงกับ routes/router.tsx
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      // ค่าเริ่มต้นของ Clerk คือพากลับไป / ซึ่งตอนนี้เป็นหน้า landing ไม่ใช่ตัวแอป
      // ถ้าไม่ตั้ง คนที่เพิ่งล็อกอินเสร็จจะเด้งกลับไปหน้าโฆษณาแทนที่จะได้ใช้งาน
      // (ถ้าถูกเด้งมาล็อกอินจากหน้าไหนในแอป Clerk จะพากลับหน้านั้นเองอยู่แล้ว)
      signInFallbackRedirectUrl={APP_PATH}
      signUpFallbackRedirectUrl={APP_PATH}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  )
}
