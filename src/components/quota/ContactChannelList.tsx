import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { contactOptions } from '@/config/contact'
import { useContact } from '@/hooks/queries'

/**
 * ไอคอนช่องทางติดต่อที่แอดมินตั้งไว้ กดแล้วเปิดแอปแชทในแท็บใหม่
 *
 * ใช้ทั้งในป๊อปอัปเครดิตหมดและขั้นติดต่อของป๊อปอัปแพ็กเกจ
 * คำขอช่องทางติดต่อเกิดตอนคอมโพเนนต์นี้ถูก render ครั้งแรกเท่านั้น
 */
export function ContactChannelList() {
  const { t } = useTranslation()
  const contact = useContact()
  const options = contactOptions(contact.data ?? null)

  if (contact.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-6 text-[13px] text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        {t('quota.loadingContacts')}
      </div>
    )
  }

  if (options.length === 0) {
    // ยังไม่ได้ตั้งช่องทางไว้ หรืออ่านไม่สำเร็จ — ต้องไม่ปล่อยให้กล่องว่างเปล่า
    return (
      <p className="rounded-lg border border-dashed border-border-strong px-4 py-5 text-center text-[12.5px] text-muted-foreground">
        {t('quota.noContacts')}
      </p>
    )
  }

  return (
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
          <img src={option.icon} alt="" className="size-full object-contain" />
        </a>
      ))}
    </div>
  )
}
