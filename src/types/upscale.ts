/** ต้องตรงกับ Preset* ใน server/internal/feature/upscale/dto.go */
export type UpscalePreset = 'fhd' | 'qhd' | 'uhd' | 'fuhd'

/** คลังรูปที่เลือกมาเป็นต้นฉบับได้ ต้องตรงกับ Library* ใน server/internal/feature/upscale/dto.go */
export type LibraryKind = 'remove_bg' | 'upscale'

/**
 * ผลลัพธ์การอัปสเกลหนึ่งรูป ต้องตรงกับ Item ใน server/internal/feature/upscale/dto.go
 * ลิงก์ทั้งสองหมดอายุใน 1 ชั่วโมง เป็น null เมื่อเซ็นลิงก์ไม่สำเร็จ
 */
export type UpscaleResult = {
  id: string
  filename: string
  /** png = ต้นฉบับมีส่วนโปร่งใส (คงความโปร่งใส) jpg = อย่างอื่น */
  format: 'png' | 'jpg'
  preset: UpscalePreset
  sourceWidth: number
  sourceHeight: number
  width: number
  height: number
  sizeBytes: number
  /** true = ขยายด้วย AI (ทุกรูปตั้งแต่ใช้ Topaz) false = รายการเก่าที่ขยายแบบธรรมดา */
  ai: boolean
  url: string | null
  previewUrl: string | null
  createdAt: string
}

/**
 * งานอัปสเกลที่เซิร์ฟเวอร์ทำเบื้องหลัง ต้องตรงกับ Job ใน server/internal/feature/upscale/dto.go
 * done มี item, failed มี error (status เดียวกับที่ HTTP จะตอบ เช่น 402, 422, 429, 503)
 */
export type UpscaleJob = {
  id: string
  status: 'processing' | 'done' | 'failed'
  /** ขนาดนี้ปกติใช้เวลาราวกี่วินาที จากเวลาจริงของงานล่าสุดบนเซิร์ฟเวอร์ ไม่มี = งานยังน้อยเกินจะบอกได้ */
  estimateSeconds?: number
  item?: UpscaleResult
  /** code เช่น MAINTENANCE_CODE (ดู lib/api/client.ts) ไม่มี = ดูจาก status */
  error?: { status: number; code?: string; message: string }
}

/** รูปในคลังที่เลือกมาอัปสเกล ขนาดมาจากที่บันทึกไว้ ไม่ต้องโหลดรูปมาวัด */
export type LibraryImage = {
  kind: LibraryKind
  id: string
  filename: string
  format: 'png' | 'jpg'
  width: number
  height: number
  sizeBytes: number
  previewUrl: string | null
  /** ลิงก์ไฟล์เต็ม ใช้เป็นภาพ "ต้นฉบับ" ตอนเทียบก่อน/หลังหลังอัปสเกลเสร็จ */
  url: string | null
}
