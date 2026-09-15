import { intlLocale } from '@/config/i18n'
import i18n from '@/config/i18n'
import type { PaymentCurrency } from '@/types/payment'

/** ราคาเต็มดอลลาร์ไม่ต้องมี .00 ($5 ไม่ใช่ $5.00) มีเศษเซนต์ค่อยแสดงสองตำแหน่ง */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** 151000 → "151,000 กีบ" ตามภาษาที่เลือก */
export function formatKip(amount: number): string {
  return `${Math.round(amount).toLocaleString(intlLocale())} ${i18n.t('checkout.kip')}`
}

export function formatPaymentAmount(amount: number, currency: PaymentCurrency): string {
  return currency === 'USD' ? formatUsd(amount) : formatKip(amount)
}
