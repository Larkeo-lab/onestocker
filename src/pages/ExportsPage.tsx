import { FileSpreadsheet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function ExportsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.exports'))

  return (
    <>
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <header className="mb-6">
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight">
            {t('nav.exports')}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('exports.description')}
          </p>
        </header>

        <EmptyState
          icon={FileSpreadsheet}
          title={t('exports.emptyTitle')}
          description={t('exports.emptyBody')}
        />
      </div>
    </>
  )
}
