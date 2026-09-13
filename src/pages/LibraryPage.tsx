import { Images, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { APP_PATH } from '@/config/site'
import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function LibraryPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.library'))

  return (
    <>
      <PageHeader
        title={t('nav.library')}
        description={t('library.description')}
      />
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <EmptyState
          icon={Images}
          title={t('library.emptyTitle')}
          description={t('library.emptyBody')}
          action={
            <Link
              to={APP_PATH}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <WandSparkles className="size-3.5" aria-hidden />
              {t('library.start')}
            </Link>
          }
        />
      </div>
    </>
  )
}
