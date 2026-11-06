import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { SignUpCard } from '@/components/auth/AuthCard'
import { SignupBlocked } from '@/components/auth/SignupBlocked'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { fetchSignupAllowed } from '@/lib/api'

/**
 * ถามเซิร์ฟเวอร์ก่อนว่าเครื่องนี้ยังสมัครได้ไหม (เพดานบัญชีต่อเครื่อง) ครบแล้วไม่แสดงฟอร์ม บอกเหตุผลแทน
 * ถามไม่ได้ (เน็ตหรือเซิร์ฟเวอร์มีปัญหา) แสดงฟอร์มตามปกติ เซิร์ฟเวอร์ตรวจซ้ำตอนบัญชีใหม่เปิดแอปครั้งแรกอยู่แล้ว
 */
export function SignUpPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.signUp'))
  const check = useQuery({ queryKey: ['signup-check'], queryFn: fetchSignupAllowed, retry: false, staleTime: 0 })
  if (check.isPending) return null
  if (check.data === false) return <SignupBlocked />
  return <SignUpCard />
}
