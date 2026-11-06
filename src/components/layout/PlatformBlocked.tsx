import { SignOutButton } from '@clerk/clerk-react'
import { Ban, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'

/** แอดมินปิดสิทธิ์ใช้เว็บของบัญชีนี้ (เซิร์ฟเวอร์ตอบ 403 จาก /auth/me ดู RequirePlatform) ออกจากระบบเพื่อใช้บัญชีอื่นได้ */
export function PlatformBlocked() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <Ban className="size-8 text-muted-foreground" aria-hidden />
      <h1 className="text-lg font-semibold">{t('account.platformBlockedTitle')}</h1>
      <p className="max-w-md text-[13.5px] text-muted-foreground">{t('account.platformBlockedText')}</p>
      <SignOutButton>
        <Button className="mt-2">
          <LogOut className="size-4" aria-hidden />
          {t('account.signOut')}
        </Button>
      </SignOutButton>
    </main>
  )
}
