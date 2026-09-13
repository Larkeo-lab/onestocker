import { Info } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

import { PlatformPicker } from '@/components/generate/PlatformPicker'
import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function PlatformsPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.platforms'))

  return (
    <>
      <PageHeader
        title={t('nav.platforms')}
        description={t('platforms.description')}
      />
      <div className={cn(CONTAINER.wide, 'space-y-5 py-6')}>
        <div className="flex gap-3 rounded-lg border border-border bg-muted px-4 py-3">
          <Info
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            <Trans
              i18nKey="platforms.info"
              components={{ mono: <span className="font-mono" /> }}
            />
          </p>
        </div>

        <PlatformPicker />
      </div>
    </>
  )
}
