import { Info } from 'lucide-react'

import { PlatformPicker } from '@/components/generate/PlatformPicker'
import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function PlatformsPage() {
  useDocumentTitle('Platforms')

  return (
    <>
      <PageHeader
        title="Platforms"
        description="Choose which marketplaces you sell on and review their metadata limits"
      />
      <div className={cn(CONTAINER.wide, 'space-y-5 py-6')}>
        <div className="flex gap-3 rounded-lg border border-border bg-muted px-4 py-3">
          <Info
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Metadata is generated once per image at full length, then trimmed to
            each platform on export — so adding a platform never costs another
            API call. Limits are shown as{' '}
            <span className="font-mono">title · description · keywords</span>.
            Adobe Stock has no description field of its own.
          </p>
        </div>

        <PlatformPicker />
      </div>
    </>
  )
}
