import i18n from '@/config/i18n'
import type { BackgroundRemoval, RemoveBgFormat, RemoveBgQuality } from '@/types/removeBg'

import { apiDelete, apiGetPaginated, apiPost, type Pagination } from './client'
import { runJob } from './jobs'

/*
  เส้นทั้งหมดต้องตรงกับ server/internal/feature/removebg/router.go
*/

export type RemoveBgQuery = {
  /** เริ่มที่ 1 */
  page?: number
  limit?: number
}

/** ขอลิงก์อัปรูปต้นฉบับขึ้น R2 ไฟล์ใหญ่เกินเพดานได้ 400 ตั้งแต่ขั้นนี้ */
export async function requestRemoveBgUpload(file: File): Promise<{ key: string; url: string }> {
  return apiPost<{ key: string; url: string }>('/remove-bg/uploads', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  })
}

/**
 * ลบพื้นหลังรูปที่อัปแล้ว ตัดเครดิตตามราคาของระดับนั้นเมื่อสำเร็จเท่านั้น
 *
 * ส่งงานแล้วเซิร์ฟเวอร์ทำเบื้องหลัง รอจนจบผ่าน runJob ไม่มีเพดานเวลาของคำขอเดียว
 * (รูปขนาดเต็ม 9600×7168 ใช้นานเกินที่คำขอเดียวรอได้ เคยขึ้นว่ารอนานเกินไปทั้งที่ทำสำเร็จแล้ว)
 * ใหญ่เกินหรือไม่พบต้นฉบับ 400 · เครดิตหมด 402 · แอดมินปิดระดับนั้น 403 · งานหาย (เซิร์ฟเวอร์เริ่มใหม่) 404
 * รูปเสีย 422 · คิวเต็มหรือผู้ให้บริการแน่น 429 · ใช้ไม่ได้หรือปิดปรับปรุง 503 · เน็ตหลุดนานจนไม่รู้ผล 0
 * requestId ใช้ id เดิมทุกครั้งที่ส่งรูปเดิม (ดู lib/api/jobs.ts) ส่งซ้ำไม่ตัดเครดิตซ้ำ
 */
export async function removeBackground(input: {
  requestId: string
  key: string
  filename: string
  format: RemoveBgFormat
  quality: RemoveBgQuality
}): Promise<BackgroundRemoval> {
  return runJob<BackgroundRemoval>({
    startPath: '/remove-bg/jobs',
    jobPath: (id) => `/remove-bg/jobs/${id}`,
    body: input,
    failedMessage: i18n.t('removeBg.failed'),
    lostMessage: i18n.t('removeBg.timeout'),
  })
}

export async function fetchRemoveBgResults(
  query: RemoveBgQuery = {},
): Promise<{ items: BackgroundRemoval[]; pagination: Pagination }> {
  return apiGetPaginated<BackgroundRemoval[]>('/remove-bg', { params: query })
}

export async function deleteRemoveBgResult(id: string): Promise<void> {
  await apiDelete(`/remove-bg/${id}`)
}
