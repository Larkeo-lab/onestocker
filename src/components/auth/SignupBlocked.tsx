import { SignOutButton } from '@clerk/clerk-react'
import { LogIn, MonitorSmartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { SIGN_IN_PATH } from '@/config/site'

/**
 * เครื่องนี้สมัครบัญชีใหม่ไม่ได้แล้ว (มีบัญชีครบเพดานบัญชีต่อเครื่องที่แอดมินตั้ง)
 *
 * signedIn = มาจากหลังสมัครเสร็จ (เซิร์ฟเวอร์ลบบัญชีที่เพิ่งสร้างแล้ว) ต้องออกจากระบบก่อน
 * ไม่ใส่ = มาจากหน้าสมัคร ยังไม่ได้สร้างบัญชี ไปหน้าเข้าสู่ระบบด้วยบัญชีเดิมได้เลย
 */
export function SignupBlocked({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useTranslation()
  const toSignIn = (
    <Button className="mt-2">
      <LogIn className="size-4" aria-hidden />
      {t('auth.signupBlocked.signIn')}
    </Button>
  )
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
      <MonitorSmartphone className="size-8 text-muted-foreground" aria-hidden />
      <h1 className="text-[15px] font-semibold">{t('auth.signupBlocked.title')}</h1>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t('auth.signupBlocked.body')}</p>
      {signedIn ? (
        <SignOutButton redirectUrl={SIGN_IN_PATH}>{toSignIn}</SignOutButton>
      ) : (
        <Link to={SIGN_IN_PATH}>{toSignIn}</Link>
      )}
    </div>
  )
}
