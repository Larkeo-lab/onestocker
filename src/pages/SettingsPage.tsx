import { useTranslation } from 'react-i18next'

import { CONTAINER } from '@/config/container'
import { PageHeader } from '@/components/header/PageHeader'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { useAsync } from '@/hooks/useAsync'
import { fetchMeta, fetchSettings } from '@/lib/api'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { t } = useTranslation()

  const settings = useAsync(fetchSettings)
  const meta = useAsync(fetchMeta)

  const loading = settings.loading || meta.loading
  const error = settings.error ?? meta.error

  return (
    <>
      <PageHeader
        width="narrow"
        title={t('nav.settings')}
        description={t('settings.description')}
      />

      <div className={cn(CONTAINER.narrow, 'space-y-5 py-6')}>
        {loading ? <Loading /> : null}

        {!loading && error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              settings.reload()
              meta.reload()
            }}
          />
        ) : null}

        {!loading && !error && settings.data && meta.data ? (
          <SettingsForm
            settings={settings.data}
            languages={meta.data.languages}
            onSaved={settings.reload}
          />
        ) : null}
      </div>
    </>
  )
}
