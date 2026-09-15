import { LoaderCircle, Trash2, WandSparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ExportMenu } from '@/components/generate/ExportMenu'
import { Button } from '@/components/ui/Button'
import type { Asset } from '@/types/asset'

export function GenerateHeader({
  assets,
  maxAssets,
  pendingCount,
  generatingCount,
  onClear,
  onGenerate,
}: {
  assets: Asset[]
  /** เพดานต่อรอบ มาจากเซิร์ฟเวอร์ผ่าน GenerateProvider */
  maxAssets: number
  /** รูปที่อัปแล้วและยังไม่มีผลลัพธ์ — จำนวนที่ปุ่ม Generate จะทำให้ */
  pendingCount: number
  /** รูปที่กำลังเรียกโมเดลอยู่ตอนนี้ */
  generatingCount: number
  onClear: () => void
  onGenerate: () => void
}) {
  const { t } = useTranslation()
  const hasAssets = assets.length > 0
  const generating = generatingCount > 0

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">
          {t('nav.generate')}
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {t('generate.description', { max: maxAssets })}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasAssets || generating}
          onClick={onClear}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {t('generate.clear')}
        </Button>
        <ExportMenu assets={assets} />
        <Button
          variant="primary"
          size="sm"
          disabled={pendingCount === 0 || generating}
          onClick={onGenerate}
        >
          {generating ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <WandSparkles className="size-3.5" aria-hidden />
          )}
          {generating
            ? t('generate.generating', { count: generatingCount })
            : pendingCount > 1
              ? t('generate.generateCount', { count: pendingCount })
              : t('generate.generate')}
        </Button>
      </div>
    </header>
  )
}
