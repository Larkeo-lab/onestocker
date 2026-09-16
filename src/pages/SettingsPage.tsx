import { useTranslation } from 'react-i18next'

import { CONTAINER } from '@/config/container'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { useMeta, useSettings } from '@/hooks/queries'
import { errorMessage } from '@/lib/error'
import { queryClient, queryKeys } from '@/lib/query'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const { t } = useTranslation()

  // มาจาก cache ถ้าเคยเปิดแล้ว ไม่ยิงซ้ำ — ค่าจะเปลี่ยนก็ต่อเมื่อกดบันทึก ซึ่งอัปเดต cache ให้เองด้านล่าง
  const settings = useSettings()
  const meta = useMeta()

  const loading = settings.isPending || meta.isPending
  const failed = settings.isError ? settings.error : meta.isError ? meta.error : null

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

        {loading && !failed ? <Loading /> : null}

        {failed ? (
          <ErrorState
            message={errorMessage(failed)}
            onRetry={() => {
              if (settings.isError) void settings.refetch()
              if (meta.isError) void meta.refetch()
            }}
          />
        ) : null}

        {settings.data && meta.data ? (
          <SettingsForm
            settings={settings.data}
            languages={meta.data.languages}
            onSaved={(saved) => queryClient.setQueryData(queryKeys.settings, saved)}
          />
        ) : null}
      </div>
    </>
  )
}
