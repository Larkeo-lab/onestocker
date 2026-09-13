import { FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function ExportsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.exports'))

  return (
    <>
      <PageHeader
        title={t('nav.exports')}
        description={t('exports.description')}
      />
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <EmptyState
          icon={FileSpreadsheet}
          title={t('exports.emptyTitle')}
          description={t('exports.emptyBody')}
        />
      </div>
    </>
  )
}
