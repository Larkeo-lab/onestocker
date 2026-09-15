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

export type MediaKind = 'image' | 'video'

export type Asset = {
  id: string
  filename: string
  kind: MediaKind
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
  /** ความยาวเป็นวินาที มีเฉพาะวิดีโอ */
  duration?: number
  status: AssetStatus
  /**
   * ตำแหน่งรูปย่อบน R2 หลังอัปสำเร็จ
   * ไฟล์ต้นฉบับไม่ถูกอัปขึ้นคลาวด์ อยู่ในเครื่องผู้ใช้เท่านั้น
   */
  previewKey?: string
  /**
   * ตำแหน่งเฟรมบน R2 เรียงตามเวลา มีเฉพาะวิดีโอ ส่งให้โมเดลดูแทนรูปย่อ
   * เฟรมถูกลบเองตาม lifecycle rule ของ bucket ไม่ได้อยู่ถาวรเหมือนรูปย่อ
   */
  frameKeys?: string[]
  error?: string
  /** สิ่งที่ตัวกรองแก้ไขหลังโมเดลตอบ เช่น ตัดชื่อแบรนด์ออก */
  notes?: string[]
  /**
   * แพลตฟอร์มที่ผลลัพธ์นี้ถูกสร้างตามกฎ มีหลังสร้างเสร็จเท่านั้น
   * ใช้เทียบกับแพลตฟอร์มที่เลือกอยู่ ถ้าผู้ใช้เปลี่ยนทีหลังจะได้รู้ว่าต้องสร้างใหม่
   */
  platformId?: string
  title: string
  keywords: string[]
  category: string
  /** ฉบับแปลตามภาษาที่เลือกไว้ในหน้า Settings */
  translations?: AssetTranslation[]
}

/** ความยาววิดีโอแบบ m:ss เช่น 0:07, 1:00 */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
