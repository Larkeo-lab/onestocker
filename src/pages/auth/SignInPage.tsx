import { SignInCard } from '@/components/auth/AuthCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SignInPage() {
  useDocumentTitle('เข้าสู่ระบบ')
  return <SignInCard />
}
