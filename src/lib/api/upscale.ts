import i18n from '@/config/i18n'
import type { LibraryKind, UpscaleJob, UpscalePreset, UpscaleResult } from '@/types/upscale'

import { apiDelete, apiGetPaginated, apiPost, type Pagination } from './client'
import { runJob } from './jobs'

/* เส้นทั้งหมดต้องตรงกับ server/internal/feature/upscale/router.go */

export type UpscaleQuery = {
  /** เริ่มที่ 1 */
  page?: number
  limit?: number
}

/** ต้นฉบับ อย่างใดอย่างหนึ่ง: อัปจากเครื่องแล้ว หรือรูปในคลัง */
export type UpscaleSource = { uploadKey: string } | { libraryKind: LibraryKind; libraryId: string }

/** ขอลิงก์อัปรูปต้นฉบับขึ้น R2 ไฟล์ใหญ่เกินเพดานได้ 400 ตั้งแต่ขั้นนี้ */
export async function requestUpscaleUpload(file: File): Promise<{ key: string; url: string }> {
  return apiPost<{ key: string; url: string }>('/upscale/uploads', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  })
}

/**
 * อัปสเกลหนึ่งรูป ตัดเครดิตเมื่อสำเร็จ
 *
 * ส่งงานแล้วเซิร์ฟเวอร์ทำเบื้องหลัง (8K ใช้นานเกินเวลาที่คำขอเดียวรอได้) รอจนจบผ่าน runJob
 * ขนาดไม่ใหญ่ขึ้นหรือเล็กเกินไป 400 · เครดิตหมด 402 · แอดมินปิด 403 · งานหาย (เซิร์ฟเวอร์เริ่มใหม่) 404
 * คิวเต็มหรือ Replicate แน่น 429 · Replicate ใช้ไม่ได้หรือปิดปรับปรุง 503 · เน็ตหลุดนานจนไม่รู้ผล 0
 * requestId ใช้ id เดิมทุกครั้งที่ส่งรูปเดิม (ดู lib/api/jobs.ts) ส่งซ้ำไม่ตัดเครดิตซ้ำ
 */
export async function upscaleImage(
  input: {
    requestId: string
    source: UpscaleSource
    filename: string
    preset: UpscalePreset
  },
  /** เซิร์ฟเวอร์รับงานแล้ว (ได้คิว) ต่อจากนี้คือรอผล job มีเวลาโดยประมาณของขนาดนี้ (ถ้ามี) */
  onStarted?: (job: UpscaleJob) => void,
): Promise<UpscaleResult> {
  return runJob<UpscaleResult, UpscaleJob>({
    startPath: '/upscale',
    jobPath: (id) => `/upscale/jobs/${id}`,
    body: input,
    onStarted,
    failedMessage: i18n.t('upscale.failed'),
    lostMessage: i18n.t('upscale.timeout'),
  })
}

export async function fetchUpscales(
  query: UpscaleQuery = {},
): Promise<{ items: UpscaleResult[]; pagination: Pagination }> {
  return apiGetPaginated<UpscaleResult[]>('/upscale', { params: query })
}

export async function deleteUpscale(id: string): Promise<void> {
  await apiDelete(`/upscale/${id}`)
}
