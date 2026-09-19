import { ApiError } from '@/lib/api'

/*
  เซิร์ฟเวอร์ตอบ 429 เมื่อคิวเต็มหรือผู้ให้บริการภายนอก (Gemini, Replicate, Cloudflare) จำกัดอัตรา
  แปลว่ายังไม่ได้ทำงานและไม่ได้ตัดเครดิต ส่งซ้ำได้ปลอดภัย
  หน้าเว็บรอแล้วส่งใหม่เองโดยไม่จำกัดเวลา ผู้ใช้เห็นว่ากำลังรอคิว ไม่เห็น error
*/

export function isServerBusy(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429
}

/**
 * เวลารอก่อนส่งใหม่ครั้งที่ attempt (เริ่ม 1) เพิ่มทีละเท่าจนถึง 8 วินาที
 * บวกสุ่มไม่เกินหนึ่งวินาที หลายแท็บที่โดนพร้อมกันจะได้ไม่กลับมาชนกันอีก
 */
export function busyRetryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 1000
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
