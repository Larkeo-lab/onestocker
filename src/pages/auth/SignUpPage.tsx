import { useTranslation } from 'react-i18next'

import { SignUpCard } from '@/components/auth/AuthCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SignUpPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.signUp'))
  return <SignUpCard />
}
