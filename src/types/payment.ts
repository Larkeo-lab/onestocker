import type { UserType } from './profile'

export type PaymentCurrency = 'LAK' | 'USD'

export type PaymentStatus = 'pending' | 'approved' | 'rejected'

/** บัญชีรับเงินในหน้าชำระเงิน ลิงก์รูปหมดอายุใน 1 ชั่วโมง */
export type PaymentAccount = {
  id: string
  accountType: string
  accountName: string
  accountNumber: string
  currency: PaymentCurrency
  logoUrl: string | null
  qrCodeImageUrl: string | null
}

export type PaymentOption = {
  currency: PaymentCurrency
  /** ยอดที่ต้องโอน กีบเป็นจำนวนเต็มที่ปัดขึ้นเป็นหลักพันแล้ว ดอลลาร์มีทศนิยมสองตำแหน่ง */
  amount: number
  /** กีบต่อ 1 ดอลลาร์ มีเฉพาะสกุลกีบ */
  unitsPerUsd: number | null
  accounts: PaymentAccount[]
}

/** การแจ้งชำระหนึ่งรายการ ตัวเลขเป็นค่า ณ ตอนแจ้ง */
export type Payment = {
  id: string
  userType: UserType
  credits: number | null
  price: number
  currency: PaymentCurrency
  amount: number
  unitsPerUsd: number | null
  bankAccount: {
    accountType: string
    accountName: string
    accountNumber: string
  }
  status: PaymentStatus
  /** เหตุผลที่ทีมงานไม่อนุมัติ */
  rejectReason: string | null
  /** ISO 8601 */
  reviewedAt: string | null
  createdAt: string
}

/**
 * ข้อมูลหน้าชำระเงินของแพ็กเกจหนึ่ง
 *
 * ต้องมีฟิลด์ตรงกับ Checkout ใน server/internal/feature/payment/dto.go
 */
export type Checkout = {
  userType: UserType
  /** null = ไม่จำกัด */
  credits: number | null
  /** ดอลลาร์สหรัฐ */
  price: number
  periodDays: number
  /** สกุลที่จ่ายได้ กีบมาก่อน ว่างได้ถ้าแอดมินยังไม่ได้เปิดบัญชีรับเงิน */
  options: PaymentOption[]
  /** รายการรอตรวจ ถ้ามีจะแจ้งใหม่ไม่ได้ */
  pending: Payment | null
}
