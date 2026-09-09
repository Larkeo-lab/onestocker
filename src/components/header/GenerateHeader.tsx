import { Download, LoaderCircle, Trash2, WandSparkles } from 'lucide-react'

import { Button } from '@/components/ui/Button'

import { PageHeader } from './PageHeader'

export function GenerateHeader({
  assetCount,
  maxAssets,
  pendingCount,
  generatingCount,
  onClear,
  onGenerate,
}: {
  assetCount: number
  /** เพดานต่อรอบ มาจากเซิร์ฟเวอร์ผ่าน GenerateProvider */
  maxAssets: number
  /** รูปที่อัปแล้วและยังไม่มีผลลัพธ์ — จำนวนที่ปุ่ม Generate จะทำให้ */
  pendingCount: number
  /** รูปที่กำลังเรียกโมเดลอยู่ตอนนี้ */
  generatingCount: number
  onClear: () => void
  onGenerate: () => void
}) {
  const hasAssets = assetCount > 0
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
          <Button size="sm" disabled={!hasAssets}>
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </Button>
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
