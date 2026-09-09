import { SignUpCard } from '@/components/auth/AuthCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SignUpPage() {
  useDocumentTitle('สมัครสมาชิก')
  return <SignUpCard />
}
