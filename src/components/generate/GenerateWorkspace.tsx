import { GenerateHeader } from '@/components/header/GenerateHeader'
import { CONTAINER } from '@/config/container'
import { cn } from '@/lib/utils'

import { AssetCard } from './AssetCard'
import { Dropzone } from './Dropzone'
import { isPending, useGenerate } from './context'

/**
 * หน้าจอของ Generate — อ่าน state จาก GenerateProvider ที่อยู่ระดับ layout
 * ทำให้เปลี่ยนไปหน้าอื่นแล้วกลับมา งานที่ทำค้างไว้ยังอยู่
 */
export function GenerateWorkspace() {
  const {
    assets,
    notice,
    maxAssets,
    addFiles,
    generate,
    regenerate,
    remove,
    clear,
  } = useGenerate()

  const pendingCount = assets.filter(isPending).length
  const generatingCount = assets.filter(
    (asset) => asset.status === 'generating',
  ).length

  return (
    <>
      <GenerateHeader
        assetCount={assets.length}
        maxAssets={maxAssets}
        pendingCount={pendingCount}
        generatingCount={generatingCount}
        onClear={clear}
        onGenerate={generate}
      />

      <div className={cn(CONTAINER.wide, 'space-y-6 py-6')}>
        <Dropzone
          count={assets.length}
          maxAssets={maxAssets}
          notice={notice}
          onFiles={addFiles}
        />

        {/* ผลลัพธ์ของแต่ละรูป เรียงลงมาตามลำดับที่อัป */}
        {assets.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Results
            </h2>
            {assets.map((asset, index) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                index={index + 1}
                onRemove={() => remove(asset.id)}
                onRegenerate={() => regenerate(asset.id)}
              />
            ))}
          </section>
        ) : null}
      </div>
    </>
  )
}
