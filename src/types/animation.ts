import type { BackgroundJob } from '@/lib/api/jobs'
import type { VideoFormat } from '@/lib/videoFormats'

/** ต้องตรงกับ Stage ใน server/internal/feature/animation/dto.go */
export type AnimationStage = 'analyzing' | 'coding' | 'checking' | 'fixing' | 'queued' | 'rendering' | 'saving'

/** ต้องตรงกับ Item ใน server/internal/feature/animation/dto.go */
export type AnimationResult = {
  id: string
  /** คลิปที่เท่าไรของงานที่สร้าง เริ่มที่ 1 */
  variant: number
  /** ชื่อวิดีโอตัวอย่างที่อัป */
  filename: string
  description: string
  /** ไม่มีในรายการประวัติ ขอด้วย fetchAnimation */
  html?: string
  /** รุ่นของ Gemini ที่เขียนโค้ด */
  model: string
  width: number
  height: number
  fps: number
  /** ความยาวลูปของคลิป (วินาที) ไฟล์ที่ดาวน์โหลดยาวเป็นผลคูณของค่านี้ (ดู downloadLengths) */
  seconds: number
  /**
   * ลิงก์ชั่วคราวอายุ 1 ชั่วโมง ไม่มีลิงก์วิดีโอ = ยังไม่ได้ render MP4
   * (สร้างแล้วดูตัวอย่างจากโค้ดก่อน render เมื่อกดดาวน์โหลด ดู store/animationVideo)
   */
  videoUrl?: string
  videoDownloadUrl?: string
  /** ลิงก์ดาวน์โหลดของทุกไฟล์ที่ render แล้ว (ชนิดไฟล์ × fps × ความยาว) ดูด้วย videoUrlFor */
  videos?: AnimationVideo[]
  htmlDownloadUrl: string
  /** ภาพปกที่ถ่ายจากโค้ด ไม่มี = ถ่ายไม่สำเร็จ */
  thumbUrl?: string
  createdAt: string
}

/** วิดีโอหนึ่งไฟล์ของคลิป ต้องตรงกับ VideoLink ใน dto.go */
export type AnimationVideo = {
  format: VideoFormat
  fps: number
  seconds: number
  resolution?: number
  background?: string
  quality?: string
  url: string
}

/** ผลของงานหนึ่ง ต้องตรงกับ Batch ใน dto.go อาจได้น้อยกว่าที่ขอถ้าบางคลิปล้มเหลว */
export type AnimationBatch = { items: AnimationResult[] }

/** งานระหว่างทำมีผลของขั้นที่เสร็จแล้ว (คำบรรยาย โค้ด) ให้แสดงก่อน html / frames เป็นของคลิปที่กำลังทำ */
export type AnimationJob = BackgroundJob<AnimationBatch> & {
  /** คลิปที่กำลังทำ เริ่มที่ 1 จากทั้งหมด count คลิป */
  current?: number
  count?: number
  stage?: AnimationStage
  description?: string
  html?: string
  framesDone?: number
  framesTotal?: number
  /** งานเดิมที่ยังทำอยู่ ไม่ใช่งานที่เพิ่งส่ง (ทำได้ทีละงาน) หน้าเว็บติดตามงานนี้ต่อ */
  attached?: boolean
  /** เหตุที่ช้ากว่าปกติ 'gemini_busy' = Gemini แน่น กำลังลองรุ่นสำรอง */
  notice?: string
}
