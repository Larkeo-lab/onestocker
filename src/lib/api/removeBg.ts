import type { BackgroundRemoval, RemoveBgFormat } from '@/types/removeBg'

import { apiDelete, apiGetPaginated, apiPost, type Pagination } from './client'

/*
  เส้นทั้งหมดต้องตรงกับ server/internal/feature/removebg/router.go
*/

/**
 * เวลารอคำตอบของการลบพื้นหลังหนึ่งรูป
 *
 * เซิร์ฟเวอร์อาจรอคิวได้ถึง 20 วินาที แล้วรอ Photoroom อีกไม่เกิน 60 วินาที
 * ค่าเริ่มต้นของ api (60 วินาที) จะตัดทิ้งก่อน ทั้งที่เซิร์ฟเวอร์ยังทำอยู่และตัดเครดิตไปแล้ว
 */
const PROCESS_TIMEOUT = 100_000

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
 * ลบพื้นหลังรูปที่อัปแล้ว ตัดหนึ่งเครดิต
 * เครดิตหมดได้ 402 · คิวเต็มได้ 429 · บริการใช้ไม่ได้ได้ 503 (สองกรณีหลังเซิร์ฟเวอร์คืนเครดิตให้แล้ว)
 */
export async function removeBackground(input: {
  key: string
  filename: string
  format: RemoveBgFormat
}): Promise<BackgroundRemoval> {
  return apiPost<BackgroundRemoval>('/remove-bg', input, { timeout: PROCESS_TIMEOUT })
}

export async function fetchRemoveBgResults(
  query: RemoveBgQuery = {},
): Promise<{ items: BackgroundRemoval[]; pagination: Pagination }> {
  return apiGetPaginated<BackgroundRemoval[]>('/remove-bg', { params: query })
}

export async function deleteRemoveBgResult(id: string): Promise<void> {
  await apiDelete(`/remove-bg/${id}`)
}
