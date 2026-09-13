import { useTranslation } from 'react-i18next'

import { SignInCard } from '@/components/auth/AuthCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function SignInPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.signIn'))
  return <SignInCard />
}
