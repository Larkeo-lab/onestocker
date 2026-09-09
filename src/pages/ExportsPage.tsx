import { FileSpreadsheet } from 'lucide-react'

import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function ExportsPage() {
  useDocumentTitle('Exports')

  return (
    <>
      <PageHeader
        title="Exports"
        description="CSV files generated for each platform"
      />
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <EmptyState
          icon={FileSpreadsheet}
          title="No exports yet"
          description="Once you export a batch, every generated CSV is kept here so you can download it again without re-running generation."
        />
      </div>
    </>
  )
}
