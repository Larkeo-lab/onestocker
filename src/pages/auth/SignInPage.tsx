import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { SignInCard } from '@/components/auth/AuthCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** กล่องเข้าสู่ระบบของ Clerk กับลิงก์ลืมรหัสผ่านที่เห็นได้ทันที (ของ Clerk โผล่หลังกรอกอีเมลเท่านั้น) */
export function SignInPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.signIn'))
  return (
    <div className="flex flex-col items-center gap-4">
      <SignInCard />
      <Link to="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
        {t('auth.forgot.link')}
      </Link>
    </div>
  )
}
