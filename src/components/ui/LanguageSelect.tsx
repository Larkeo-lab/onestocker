import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '@/config/i18n'
import { APP_LANGUAGE_CODES, APP_LANGUAGES, isAppLanguage } from '@/config/languages'
import { cn } from '@/lib/utils'

/**
 * ช่องเลือกภาษาของตัวแอป
 *
 * หน้าตาเดียวกับของหน้า landing แต่ของ landing เป็น HTML นิ่งที่ย้ายหน้าเอา
 * ตัวนี้เปลี่ยนภาษาทันทีโดยไม่โหลดใหม่ งานที่ทำค้างอยู่ในหน้า Generate จึงไม่หาย
 * ภาษาที่เลือกถูกจำไว้ใน localStorage (ดู config/i18n.ts)
 */
export function LanguageSelect({ className }: { className?: string }) {
  // เรียก hook เพื่อให้ re-render ตอนเปลี่ยนภาษา
  const { t, i18n } = useTranslation()
  const language = currentLanguage()

  return (
    <div className={cn('relative flex items-center', className)}>
      <img
        src={APP_LANGUAGES[language].flag}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-4 rounded-xs object-cover"
      />
      <select
        aria-label={t('common.selectLanguage')}
        value={language}
        onChange={(event) => {
          if (isAppLanguage(event.target.value)) {
            void i18n.changeLanguage(event.target.value)
          }
        }}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-border bg-card pr-7 pl-8 text-[12.5px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-muted focus:ring-2 focus:ring-primary/40 focus:outline-none"
      >
        {APP_LANGUAGE_CODES.map((code) => (
          <option key={code} value={code} lang={code} className="bg-card text-foreground">
            {APP_LANGUAGES[code].label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
