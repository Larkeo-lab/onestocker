import type { AssetTranslation } from '@/types/asset'

import { apiPost } from './client'

export type GenerateRequest = {
  /** ตำแหน่งรูปย่อบน R2 ที่อัปเสร็จแล้ว */
  previewKey: string
  filename: string
  /** เฟรมจากวิดีโอเรียงตามเวลา ไม่ส่งมาแปลว่าเป็นรูป */
  frameKeys?: string[]
  /** ID ของแพลตฟอร์มที่เลือกไว้ ใช้ตัดคีย์เวิร์ดตาม limit ของแต่ละ platform */
  platformIds: string[]
}

export type GenerateResponse = {
  /** แพลตฟอร์มที่เซิร์ฟเวอร์ใช้กฎจริง ได้ general ถ้าส่ง id ที่ไม่รู้จักไป */
  platform: string
  title: string
  keywords: string[]
  category: string
  /** ฉบับแปลตามภาษาที่เลือกไว้ในหน้า Settings */
  translations?: AssetTranslation[]
  /** สิ่งที่ตัวกรองแก้ไขหลังโมเดลตอบ เช่น ตัดชื่อแบรนด์ออก */
  notes?: string[]
}

/*
  รอคำตอบนานกว่าเวลาที่เซิร์ฟเวอร์ใช้จริง

  เซิร์ฟเวอร์รอ Gemini ได้นานสุดหนึ่งนาที (requestTimeout ใน server/internal/feature/generate/gemini.go)
  เกินกว่านั้นตอบ 429 ให้รอแล้วส่งใหม่ ค่าปกติของ axios คือหนึ่งนาทีเท่ากัน ซึ่งพอดีเกินไป
  ถอดใจตอนที่งานสำเร็จอยู่พอดีแปลว่าเสียเครดิตฟรี ผู้ใช้เห็นแค่ว่าต่อเซิร์ฟเวอร์ไม่ได้

  ต้องไม่เกิน 100 วินาที ซึ่งเป็นเพดานที่ Cloudflare ตัดคำขอทิ้งอยู่แล้ว
*/
const GENERATE_TIMEOUT = 90_000

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
  return apiPost<GenerateResponse>('/generate', body, {
    signal,
    timeout: GENERATE_TIMEOUT,
  })
}
