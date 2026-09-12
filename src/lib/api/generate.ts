import type { AssetTranslation } from '@/types/asset'

import { apiPost } from './client'

export type GenerateRequest = {
  /** ตำแหน่งรูปย่อบน R2 ที่อัปเสร็จแล้ว */
  previewKey: string
  filename: string
  /** ID ของแพลตฟอร์มที่เลือกไว้ ใช้ตัดคีย์เวิร์ดตาม limit ของแต่ละ platform */
  platformIds: string[]
}

export type GenerateResponse = {
  title: string
  keywords: string[]
  category: string
  /** ฉบับแปลตามภาษาที่เลือกไว้ในหน้า Settings */
  translations?: AssetTranslation[]
  /** สิ่งที่ตัวกรองแก้ไขหลังโมเดลตอบ เช่น ตัดชื่อแบรนด์ออก */
  notes?: string[]
}

/**
 * ส่งแค่ previewKey ไม่ได้ส่งตัวรูป
 *
 * เวอร์ชัน Next.js เดิมอัปรูปสองรอบ (ขึ้น R2 หนึ่งครั้ง แล้วแนบไปกับ
 * request อีกครั้ง) แบบนี้ให้ Go ไปดึงจาก R2 เอง ผู้ใช้รอครึ่งเดียว
 * และ R2 ไม่คิดค่า egress ขาออกไป EC2
 */
export async function generateMetadata(
  body: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  return apiPost<GenerateResponse>('/generate', body, { signal })
}
