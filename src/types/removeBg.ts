/**
 * png = พื้นหลังโปร่งใส, jpg = พื้นหลังขาว
 * ต้องตรงกับ FormatPNG / FormatJPG ใน server/internal/feature/removebg/dto.go
 */
export type RemoveBgFormat = 'png' | 'jpg'

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
  width: number
  height: number
  sizeBytes: number
  /** ลิงก์ดาวน์โหลดไฟล์เต็ม เปิดแล้วเบราว์เซอร์บันทึกเป็นไฟล์ทันที */
  url: string | null
  /** รูปย่อด้านยาวสุด 640px ไว้แสดงในหน้าเว็บ */
  previewUrl: string | null
  createdAt: string
}
