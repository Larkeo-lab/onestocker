import { Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { formatDayMonth } from '@/lib/date'
import { useUsageStore } from '@/store/usage'

import { ContactChannelList } from './ContactChannelList'

/**
 * ป๊อปอัปที่ขึ้นเมื่อทำงานที่ใช้เครดิตไม่ได้เพราะเครดิตหมดหรือเหลือไม่พอ
 * (ฟรีครบแล้ว เครดิตในรอบเสียเงินหมด หรือเหลือน้อยกว่าที่งานนั้นใช้ เช่นลบพื้นหลังใช้ 6 แต่เหลือ 3)
 *
 * ปุ่ม Upgrade บน header ไม่ได้เปิดตัวนี้ แต่เปิดป๊อปอัปแพ็กเกจ (PlansDialog)
 * ตัวนี้มีปุ่มดูแพ็กเกจให้ไปต่อได้เช่นกัน
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
  const { t } = useTranslation()
  const usage = useUsageStore((state) => state.usage)
  const dismiss = useUsageStore((state) => state.dismissLimitReached)
  const openPlans = useUsageStore((state) => state.openPlans)

  // ปิดด้วย Escape ตามที่คนคาดหวังจากกล่องแบบนี้
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss])

  const limit = usage?.limit ?? null
  // ยังเหลืออยู่แต่ไม่พอสำหรับงานนี้ ห้ามบอกว่าหมด ตัวเลขบน header ยังไม่เป็นศูนย์
  const remaining = usage?.remaining ?? null
  const notEnough = remaining !== null && remaining > 0

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
          aria-label={t('common.close')}
          autoFocus
          className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>

        <h2
          id="quota-dialog-title"
          className="pr-8 text-[15px] font-semibold tracking-tight"
        >
          {notEnough ? t('quota.notEnoughTitle') : t('quota.title')}
        </h2>

        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {notEnough ? (
            t('quota.notEnough', { count: remaining })
          ) : usage && limit !== null ? (
            usage.expiresAt ? (
              <>
                {t('quota.paidUsage', {
                  used: usage.used.toLocaleString(intlLocale()),
                  limit: limit.toLocaleString(intlLocale()),
                  plan: usage.userType,
                })}
                {t('quota.expires', { date: formatDayMonth(usage.expiresAt) })}
              </>
            ) : (
              t('quota.freeUsage', { limit: limit.toLocaleString(intlLocale()) })
            )
          ) : (
            t('quota.noUsage')
          )}
        </p>

        <p className="mt-3 text-[13px]">{t('quota.upgrade')}</p>

        <div className="mt-4">
          <ContactChannelList />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={openPlans}>
            <Sparkles className="size-3.5" aria-hidden />
            {t('plans.viewPlans')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={dismiss}>
            {t('quota.later')}
          </Button>
        </div>
      </div>
    </div>
  )
}
