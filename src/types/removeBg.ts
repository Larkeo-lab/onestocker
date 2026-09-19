/**
 * png = พื้นหลังโปร่งใส, jpg = พื้นหลังขาว
 * ต้องตรงกับ FormatPNG / FormatJPG ใน server/internal/feature/removebg/dto.go
 */
export type RemoveBgFormat = 'png' | 'jpg'

/**
 * standard = Cloudflare Images ประหยัดเครดิต (ไม่เกิน 1,500 px), hd = Replicate (Topaz 4K + Bria) คมชัดด้วย AI
 * ต้องตรงกับ QualityStandard / QualityHD ใน server/internal/feature/removebg/dto.go
 */
export type RemoveBgQuality = 'standard' | 'hd'

/** งานในหน้า ตั้งค่าเครดิต ของแต่ละระดับ ใช้อ่านราคาและการเปิด/ปิด */
export const QUALITY_FEATURE = {
  standard: 'removeBgStandard',
  hd: 'removeBg',
} as const

/**
 * ผลลัพธ์การลบพื้นหลังหนึ่งรูป ต้องตรงกับ Item ใน server/internal/feature/removebg/dto.go
 *
 * ลิงก์ทั้งสองหมดอายุใน 1 ชั่วโมง เป็น null เมื่อเซ็นลิงก์ไม่สำเร็จ
 */
export type BackgroundRemoval = {
  id: string
  /** ชื่อไฟล์ตอนดาวน์โหลด เช่น cat-no-bg.png */
  filename: string
  format: RemoveBgFormat
  quality: RemoveBgQuality
  width: number
  height: number
  sizeBytes: number
  /** ลิงก์ดาวน์โหลดไฟล์เต็ม เปิดแล้วเบราว์เซอร์บันทึกเป็นไฟล์ทันที */
  url: string | null
  /** รูปย่อด้านยาวสุด 640px ไว้แสดงในหน้าเว็บ */
  previewUrl: string | null
  /**
   * ไฟล์ขนาดดูบนจอ (ด้านยาว 2560 px) หน้าดูรูปใช้แทนไฟล์เต็มที่ใหญ่หลายสิบ MB null = ไม่มี ใช้ไฟล์เต็ม
   * displayUrl เป็น JPEG ของสี displayMaskUrl เป็น PNG ขาวดำของความโปร่งใส (มีเฉพาะผลลัพธ์ PNG)
   * ไม่มีในเซิร์ฟเวอร์รุ่นก่อน
   */
  displayUrl?: string | null
  displayMaskUrl?: string | null
  createdAt: string
}
