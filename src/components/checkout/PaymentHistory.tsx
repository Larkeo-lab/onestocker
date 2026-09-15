import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/Badge'
import { useMyPayments } from '@/hooks/queries'
import { formatDayMonth } from '@/lib/date'
import { formatPaymentAmount } from '@/lib/money'
import type { PaymentStatus } from '@/types/payment'

const TONES: Record<PaymentStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const LABELS = {
  pending: 'checkout.statusPending',
  approved: 'checkout.statusApproved',
  rejected: 'checkout.statusRejected',
} as const

/** การแจ้งชำระล่าสุดของตัวเอง ไม่มีรายการเลยก็ไม่แสดงหัวข้อ */
export function PaymentHistory() {
  const { t } = useTranslation()
  const payments = useMyPayments()

  if (!payments.data || payments.data.length === 0) return null

  return (
    <section>
      <h2 className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t('checkout.historyTitle')}
      </h2>
      <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
        {payments.data.map((payment) => (
          <li key={payment.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">
                {payment.userType} · {formatPaymentAmount(payment.amount, payment.currency)}
              </p>
              <p className="text-[11.5px] text-subtle-foreground">
                {formatDayMonth(payment.createdAt)} · {payment.bankAccount.accountType}
              </p>
              {payment.status === 'rejected' && payment.rejectReason ? (
                <p className="mt-0.5 text-[12px] text-danger">
                  {t('checkout.rejectReason', { reason: payment.rejectReason })}
                </p>
              ) : null}
            </div>
            <Badge tone={TONES[payment.status]}>{t(LABELS[payment.status])}</Badge>
          </li>
        ))}
      </ul>
    </section>
  )
}
