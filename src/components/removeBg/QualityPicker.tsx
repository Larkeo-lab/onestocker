import { Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { enabledQualities } from '@/lib/removeBg'
import { cn } from '@/lib/utils'
import type { CreditCosts } from '@/types/creditCost'
import { QUALITY_FEATURE, type RemoveBgQuality } from '@/types/removeBg'

/**
 * เลือกระดับคุณภาพพร้อมเครดิตต่อรูปของแต่ละระดับ
 * แสดงเฉพาะระดับที่แอดมินเปิดอยู่ เปิดไว้ระดับเดียวก็ยังแสดงให้เห็นว่าได้แบบไหนและใช้กี่เครดิต
 */
export function QualityPicker({
  costs,
  value,
  onChange,
}: {
  costs: CreditCosts
  value: RemoveBgQuality
  onChange: (quality: RemoveBgQuality) => void
}) {
  const { t } = useTranslation()

  const info: Record<RemoveBgQuality, { label: string; hint: string; icon: LucideIcon }> = {
    standard: { label: t('removeBg.qualityStandard'), hint: t('removeBg.qualityStandardHint'), icon: Zap },
    hd: { label: t('removeBg.qualityHd'), hint: t('removeBg.qualityHdHint'), icon: Sparkles },
  }

  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-medium text-muted-foreground">{t('removeBg.qualityLabel')}</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {enabledQualities(costs).map((quality) => {
          const selected = quality === value
          const { label, hint, icon: Icon } = info[quality]
          const credits = costs[QUALITY_FEATURE[quality]]
          return (
            <label
              key={quality}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 transition-colors',
                'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40',
                selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="remove-bg-quality"
                value={quality}
                checked={selected}
                onChange={() => onChange(quality)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-md',
                  selected ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('text-[13px] font-medium', selected && 'text-primary')}>{label}</span>
                  <span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
                    {t('removeBg.costPerImage', { count: credits })}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{hint}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
