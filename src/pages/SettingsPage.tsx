import { useTranslation } from 'react-i18next'

import { CONTAINER } from '@/config/container'
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
      <div className={cn(CONTAINER.narrow, 'space-y-5 py-6')}>
        <header>
          <h1 className="text-[15px] leading-tight font-semibold tracking-tight">
            {t('nav.settings')}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t('settings.description')}
          </p>
        </header>

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
