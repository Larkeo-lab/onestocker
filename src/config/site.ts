/**
 * ค่าคงที่ระดับแอป แก้ที่นี่ที่เดียวแล้วใช้ร่วมกันทั้ง UI และ title ของหน้า
 */
export const siteConfig = {
  name: 'One Stock',
  description: 'เครื่องมือจัดการ metadata สำหรับงาน Adobe Stock',
} as const

/**
 * ค่าสำรองระหว่างรอคำตอบจาก GET /meta
 *
 * ค่าจริงเซิร์ฟเวอร์เป็นเจ้าของ ตัวเลขนี้ใช้แค่ตอนหน้าเว็บเพิ่งเปิด
 * หรือตอนต่อ API ไม่ติด จะได้ยังกดใช้งานได้ไม่ค้าง
 */
export const FALLBACK_MAX_ASSETS = 30

/** ยิง generate พร้อมกันกี่รูป มากเกินไปจะไปชนลิมิตของ Gemini */
export const GENERATE_CONCURRENCY = 3

/** อัปขึ้น R2 พร้อมกันกี่ไฟล์ */
export const UPLOAD_CONCURRENCY = 4

export type SiteConfig = typeof siteConfig
