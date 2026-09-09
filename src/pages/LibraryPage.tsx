import { Images, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/header/PageHeader'
import { CONTAINER } from '@/config/container'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

export function LibraryPage() {
  useDocumentTitle('Library')

  return (
    <>
      <PageHeader
        title="Library"
        description="Every batch you have processed, with its generated metadata"
      />
      <div className={cn(CONTAINER.wide, 'py-6')}>
        <EmptyState
          icon={Images}
          title="No batches saved yet"
          description="Batches you generate metadata for will be collected here so you can revisit and re-export them later."
          action={
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <WandSparkles className="size-3.5" aria-hidden />
              Start a batch
            </Link>
          }
        />
      </div>
    </>
  )
}
