import type { UserType } from '@/types/profile'
import type { Checkout, Payment, PaymentCurrency } from '@/types/payment'

import { apiGet, apiPost } from './client'

/**
 * ราคา ยอดแต่ละสกุล บัญชีรับเงิน และรายการที่รอตรวจ ของแพ็กเกจที่จะซื้อ
 * แพ็กเกจที่ยังไม่ตั้งราคาได้ 409
 */
export async function fetchCheckout(userType: UserType): Promise<Checkout> {
  return apiGet<Checkout>(`/payments/checkout/${userType}`)
}

/** การแจ้งชำระล่าสุดของตัวเอง ใหม่ไปเก่า */
export async function fetchMyPayments(): Promise<Payment[]> {
  return apiGet<Payment[]>('/payments')
}

/** ขอลิงก์อัปสลิปขึ้น R2 ได้ key ไว้ส่งตอนแจ้งชำระ */
export async function requestSlipUpload(
  contentType: string,
): Promise<{ key: string; url: string }> {
  return apiPost<{ key: string; url: string }>('/payments/slip-uploads', { contentType })
}

export type SubmitPaymentInput = {
  userType: UserType
  currency: PaymentCurrency
  /**
   * ยอดที่แสดงบนหน้าจอตอนโอน เซิร์ฟเวอร์คิดใหม่แล้วเทียบ
   * ถ้าราคาหรือเรทเปลี่ยนระหว่างที่เปิดหน้าค้างไว้จะได้ 409
   */
  amount: number
  bankAccountId: string
  slipKey: string
}

/** แจ้งชำระ ได้รายการสถานะรอตรวจ มีรายการรอตรวจอยู่แล้วได้ 409 */
export async function submitPayment(input: SubmitPaymentInput): Promise<Payment> {
  return apiPost<Payment>('/payments', input)
}
