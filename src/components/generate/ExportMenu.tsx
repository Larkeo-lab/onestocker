import { Check, ChevronDown, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { EXPORT_FORMATS, exportAssets } from '@/lib/export'
import { cn } from '@/lib/utils'
import type { Asset } from '@/types/asset'

/** นานแค่ไหนที่ยังโชว์ว่าเพิ่งดาวน์โหลดไปกี่แถว */
const CONFIRM_MS = 2500

export function ExportMenu({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false)
  const [exported, setExported] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  // ส่งออกได้เฉพาะรูปที่มีผลลัพธ์แล้ว รูปที่ยังไม่ได้เจนจะกลายเป็นแถวว่าง
  // ซึ่งทำให้แพลตฟอร์มปฏิเสธทั้งไฟล์
  const ready = assets.filter(
    (asset) => asset.status === 'generated' && asset.title.trim() !== '',
  ).length

  function run(formatId: string) {
    setOpen(false)
    const count = exportAssets(assets, formatId)

    setExported(count)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setExported(null), CONFIRM_MS)
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        disabled={ready === 0}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={
          ready === 0
            ? 'ยังไม่มีรูปที่สร้าง metadata เสร็จ'
            : `ส่งออก ${ready} รูป`
        }
      >
        {exported === null ? (
          <Download className="size-3.5" aria-hidden />
        ) : (
          <Check className="size-3.5 text-success" aria-hidden />
        )}
        {exported === null ? 'Export CSV' : `ส่งออก ${exported} รูปแล้ว`}
        <ChevronDown className="size-3 opacity-60" aria-hidden />
      </Button>

      {open ? (
        <>
          {/* คลิกที่อื่นแล้วปิดเมนู */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.08em] text-subtle-foreground uppercase">
              เลือกรูปแบบไฟล์
            </p>

            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.id}
                type="button"
                role="menuitem"
                onClick={() => run(format.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted"
              >
                <span>{format.label}</span>
                {format.verified ? null : (
                  <span
                    title="รูปแบบคอลัมน์ยังไม่ได้เทียบกับเทมเพลตทางการ"
                    className="shrink-0 rounded border border-warning/40 bg-warning-soft px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-warning uppercase"
                  >
                    beta
                  </span>
                )}
              </button>
            ))}

            <p
              className={cn(
                'mt-1 border-t border-border px-3 pt-2 pb-1',
                'text-[11px] leading-relaxed text-subtle-foreground',
              )}
            >
              อัปไฟล์รูปขึ้นแพลตฟอร์มก่อน แล้วค่อยอัป CSV — ระบบจับคู่ด้วยชื่อไฟล์
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}
