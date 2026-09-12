import type { UserType } from './profile'

/**
 * ยอดการสร้าง metadata ของผู้ใช้ในเดือนปัจจุบัน
 *
 * ต้องมีฟิลด์ตรงกับ Usage ใน server/internal/feature/quota/dto.go
 *
 * monthlyLimit กับ remaining เป็น null พร้อมกันเสมอ แปลว่าระดับนั้นไม่จำกัด
 */
export type Usage = {
  userType: UserType
  used: number
  monthlyLimit: number | null
  remaining: number | null
  /** ISO 8601 — เที่ยงคืนวันที่ 1 ของเดือนถัดไปตามเวลาไทย */
  resetsAt: string
}
