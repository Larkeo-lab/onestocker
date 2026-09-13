import { useTranslation } from 'react-i18next'

import { GenerateWorkspace } from '@/components/generate/GenerateWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function GeneratePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.generate'))
  return <GenerateWorkspace />
}
