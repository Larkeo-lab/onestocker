import { Images, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { APP_PATH } from '@/config/site'
import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function LibraryPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.library'))

  return (
    <>
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <header className="mb-6">
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight">
            {t('nav.library')}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('library.description')}
          </p>
        </header>

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
