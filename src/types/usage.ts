import type { UserType } from './profile'

/**
 * เครดิตที่ใช้ได้ตอนนี้ของผู้ใช้
 *
 * ต้องมีฟิลด์ตรงกับ Summary ใน server/internal/shared/credits/credits.go
 *
 * - FREE: เครดิตฟรีครั้งเดียวตลอดชีพ ไม่รีเซ็ต — expiresAt เป็น null
 * - PLUS / PRO / ULTRA: เครดิตจากการเติม ใช้ได้ 30 วันนับจากวันเติม — ครบแล้วกลับเป็น FREE
 *
 * limit กับ remaining เป็น null พร้อมกันเสมอ แปลว่าไม่จำกัด
 */
export type Usage = {
  /** ระดับที่มีผลตอนนี้ แพ็กเกจที่หมดรอบแล้วเป็น FREE ทันที */
  userType: UserType
  used: number
  limit: number | null
  remaining: number | null
  /** ISO 8601 — วันหมดอายุของเครดิตเสียเงิน null เมื่อเป็นเครดิตฟรี */
  expiresAt: string | null
}
