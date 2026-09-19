import { useQueryClient } from '@tanstack/react-query'

import { LibraryItemCard } from '@/components/library/LibraryItemCard'
import { intlLocale } from '@/config/i18n'
import { deleteRemoveBgResult } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { displayFiles, formatBytes, resultViewKey } from '@/lib/removeBg'
import type { BackgroundRemoval } from '@/types/removeBg'

import { FormatChip, QualityChip } from './ResultPreview'

/** ผลลัพธ์การลบพื้นหลังหนึ่งรูปในคลังรูป */
export function ResultCard({ item }: { item: BackgroundRemoval }) {
  const queryClient = useQueryClient()
  const date = new Date(item.createdAt).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <LibraryItemCard
      viewerId={resultViewKey(item)}
      previewUrl={item.previewUrl}
      transparent={item.format === 'png'}
      filename={item.filename}
      width={item.width}
      height={item.height}
      details={`${item.width.toLocaleString(intlLocale())}×${item.height.toLocaleString(intlLocale())} · ${formatBytes(item.sizeBytes)} · ${date}`}
      chips={
        <>
          <QualityChip quality={item.quality} />
          <FormatChip format={item.format} />
        </>
      }
      downloadUrl={item.url}
      display={displayFiles(item)}
      onDelete={async () => {
        await deleteRemoveBgResult(item.id)
        await queryClient.invalidateQueries({ queryKey: queryKeys.removeBg.all })
      }}
    />
  )
}
