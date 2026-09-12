import { LoaderCircle, X } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/Button'
import { contactOptions } from '@/config/contact'
import { useAsync } from '@/hooks/useAsync'
import { fetchContact } from '@/lib/api/contact'
import { useUsageStore } from '@/store/usage'

function formatResetDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/**
 * ป๊อปอัปที่ขึ้นเมื่อสร้าง metadata ไม่ได้เพราะโควตาเดือนนี้หมด
 *
 * แยกตัวนอกกับตัวในเป็นสองคอมโพเนนต์ เพื่อให้คำขอช่องทางติดต่อเกิดขึ้น
 * ตอนป๊อปอัปถูกเปิดจริงเท่านั้น — ผู้ใช้ส่วนใหญ่ไม่เคยเห็นหน้านี้
 */
export function QuotaDialog() {
  const open = useUsageStore((state) => state.limitReached)
  if (!open) return null
  return <QuotaDialogContent />
}

function QuotaDialogContent() {
  const usage = useUsageStore((state) => state.usage)
  const dismiss = useUsageStore((state) => state.dismissLimitReached)

  const contact = useAsync(fetchContact)
  const options = contactOptions(contact.data ?? null)

  // ปิดด้วย Escape ตามที่คนคาดหวังจากกล่องแบบนี้
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss])

  const limit = usage?.monthlyLimit ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      // คลิกพื้นหลังเพื่อปิด แต่คลิกในกล่องต้องไม่ปิด
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quota-dialog-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิด"
          autoFocus
          className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>

        <h2
          id="quota-dialog-title"
          className="pr-8 text-[15px] font-semibold tracking-tight"
        >
          โควตาเดือนนี้หมดแล้ว
        </h2>

        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {usage && limit !== null ? (
            <>
              ใช้ไป {usage.used.toLocaleString('th-TH')} จาก{' '}
              {limit.toLocaleString('th-TH')} รูปของแพ็กเกจ {usage.userType}
              {usage.resetsAt ? ` — รีเซ็ตวันที่ ${formatResetDate(usage.resetsAt)}` : ''}
            </>
          ) : (
            'สร้างต่อไม่ได้เพราะใช้ครบตามแพ็กเกจของเดือนนี้แล้ว'
          )}
        </p>

        <p className="mt-3 text-[13px]">
          อยากใช้ต่อเลยไหม ทักมาทางช่องทางด้านล่าง เราจะอัปเกรดแพ็กเกจให้
        </p>

        <div className="mt-4">
          {contact.loading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-6 text-[13px] text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              กำลังโหลดช่องทางติดต่อ
            </div>
          ) : options.length === 0 ? (
            /* ยังไม่ได้ตั้งช่องทางไว้ หรืออ่านไม่สำเร็จ — ต้องไม่ปล่อยให้กล่องว่างเปล่า */
            <p className="rounded-lg border border-dashed border-border-strong px-4 py-5 text-center text-[12.5px] text-muted-foreground">
              ยังไม่ได้ตั้งช่องทางติดต่อไว้ กรุณาลองใหม่อีกครั้งภายหลัง
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {options.map((option) => (
                <a
                  key={option.key}
                  href={option.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  // เหลือแต่ไอคอน ชื่อช่องทางจึงต้องมาทาง aria-label ให้โปรแกรมอ่านหน้าจอ
                  // ส่วน title ให้คนที่ชี้ค้างไว้เห็นว่าเบอร์หรือลิงก์คืออะไรก่อนกด
                  aria-label={option.label}
                  title={`${option.label} · ${option.display}`}
                  className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-2xs transition-transform hover:scale-110"
                >
                  {/* โลโก้มีขอบขาวในไฟล์อยู่แล้ว จึงไม่ต้องเติม padding ซ้ำ
                      alt ว่างเพราะ aria-label ของลิงก์บอกไปแล้ว ไม่งั้นจะถูกอ่านสองรอบ */}
                  <img
                    src={option.icon}
                    alt=""
                    className="size-full object-contain"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" className="mt-4 w-full" onClick={dismiss}>
          ไว้ทีหลัง
        </Button>
      </div>
    </div>
  )
}
