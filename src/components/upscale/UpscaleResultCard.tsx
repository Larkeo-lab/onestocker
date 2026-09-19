import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { LibraryItemCard } from '@/components/library/LibraryItemCard'
import { intlLocale } from '@/config/i18n'
import { deleteUpscale } from '@/lib/api'
import { queryKeys } from '@/lib/query'
import { formatBytes } from '@/lib/removeBg'
import { presetShortName } from '@/lib/upscale'
import type { UpscaleResult } from '@/types/upscale'

/** ผลลัพธ์การอัปสเกลหนึ่งรูปในคลังรูป */
export function UpscaleResultCard({ item }: { item: UpscaleResult }) {
  const queryClient = useQueryClient()
  const locale = intlLocale()
  const date = new Date(item.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <LibraryItemCard
      viewerId={`upscale/${item.id}`}
      previewUrl={item.previewUrl}
      transparent={item.format === 'png'}
      filename={item.filename}
      width={item.width}
      height={item.height}
      details={`${item.width.toLocaleString(locale)}×${item.height.toLocaleString(locale)} · ${formatBytes(item.sizeBytes)} · ${date}`}
      chips={<UpscaleChips item={item} />}
      downloadUrl={item.url}
      onDelete={async () => {
        await deleteUpscale(item.id)
        await queryClient.invalidateQueries({ queryKey: queryKeys.upscale.all })
      }}
    />
  )
}

/** ป้ายขนาดที่อัปสเกล กับขนาดต้นฉบับ ใช้ทั้งในคลังรูปและหน้าดูรูปของการ์ดในหน้าอัปสเกล */
export function UpscaleChips({ item }: { item: UpscaleResult }) {
  const { t } = useTranslation()
  const locale = intlLocale()
  return (
    <>
      <span className="shrink-0 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[10.5px] font-medium text-primary">
        {presetShortName(item.preset)}
        {/* รายการเก่าที่ขยายแบบธรรมดา (ก่อนใช้ Topaz) ไม่มีป้าย AI */}
        {item.ai ? ' · AI' : ''}
      </span>
      <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground tabular-nums">
        {t('library.upscaledFrom', {
          width: item.sourceWidth.toLocaleString(locale),
          height: item.sourceHeight.toLocaleString(locale),
        })}
      </span>
    </>
  )
}
