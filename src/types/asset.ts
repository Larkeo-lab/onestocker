export type AssetStatus =
  | 'uploading'
  | 'ready'
  | 'generating'
  | 'generated'
  | 'error'

/** ผลลัพธ์ฉบับแปลหนึ่งภาษา ไม่มี category เพราะ Adobe รับเป็นอังกฤษเท่านั้น */
export type AssetTranslation = {
  language: string
  title: string
  keywords: string[]
}

export type Asset = {
  id: string
  filename: string
  /**
   * blob URL ของรูปที่ย่อแล้ว ใช้แสดงตัวอย่างทันที
   * ไม่ต้องโหลดกลับจาก R2 ระหว่างที่ยังอยู่ในหน้าเดียวกัน
   */
  previewUrl: string
  /** ขนาดจริงของไฟล์ต้นฉบับ ใช้แสดงผลเท่านั้น */
  width: number
  height: number
  /** ขนาดไฟล์ต้นฉบับเป็นไบต์ */
  size: number
  status: AssetStatus
  /**
   * ตำแหน่งรูปย่อบน R2 หลังอัปสำเร็จ
   * ไฟล์ต้นฉบับไม่ถูกอัปขึ้นคลาวด์ อยู่ในเครื่องผู้ใช้เท่านั้น
   */
  previewKey?: string
  error?: string
  /** สิ่งที่ตัวกรองแก้ไขหลังโมเดลตอบ เช่น ตัดชื่อแบรนด์ออก */
  notes?: string[]
  title: string
  keywords: string[]
  category: string
  /** ฉบับแปลตามภาษาที่เลือกไว้ในหน้า Settings */
  translations?: AssetTranslation[]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
