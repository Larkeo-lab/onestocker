import { LoaderCircle, Trash2, WandSparkles } from 'lucide-react'

import { ExportMenu } from '@/components/generate/ExportMenu'
import { Button } from '@/components/ui/Button'
import type { Asset } from '@/types/asset'

import { PageHeader } from './PageHeader'

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
  const hasAssets = assets.length > 0
  const generating = generatingCount > 0

  return (
    <PageHeader
      title="Generate"
      description={`Upload up to ${maxAssets} images to generate their titles and descriptions`}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasAssets || generating}
            onClick={onClear}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Clear
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
              ? `Generating ${generatingCount}`
              : pendingCount > 1
                ? `Generate ${pendingCount}`
                : 'Generate'}
          </Button>
        </>
      }
    />
  )
}
