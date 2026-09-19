import i18n from '@/config/i18n'
import { OFFLINE_CODE } from '@/lib/network'
import type { LibraryKind, UpscaleJob, UpscalePreset, UpscaleResult } from '@/types/upscale'

import { ApiError, MAINTENANCE_CODE, apiDelete, apiGet, apiGetPaginated, apiPost, type Pagination } from './client'

/* เส้นทั้งหมดต้องตรงกับ server/internal/feature/upscale/router.go */

/** เวลารอคำตอบตอนส่งงาน เซิร์ฟเวอร์อาจรอคิวได้ถึง 15 วินาทีก่อนรับงาน */
const START_TIMEOUT = 30_000

/** เน็ตหลุดตอนส่งงาน ส่งซ้ำเองได้นานสุดเท่านี้ ส่งซ้ำด้วย requestId เดิมปลอดภัย (ดู upscaleImage) */
const START_RETRY_WINDOW = 2 * 60_000

/** ถามสถานะงานทุกเท่านี้ งานหนึ่งใช้ 15–60 วินาที ถามถี่กว่านี้ก็ไม่ได้ผลเร็วขึ้น */
const POLL_INTERVAL = 2_000

/**
 * รอผลนานสุดเท่านี้ เซิร์ฟเวอร์จบทุกงานภายในราว 6 นาทีหลังรับงาน (jobTimeout 4 นาที + saveTimeout 2 นาที)
 * เกินนี้คือเน็ตหลุดนานจนไม่รู้ผล ผู้ใช้กดลองใหม่ได้ปลอดภัย
 */
const MAX_WAIT = 10 * 60_000

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
 * ส่งงานแล้วเซิร์ฟเวอร์ทำเบื้องหลัง (8K ใช้นานเกินเวลาที่คำขอเดียวรอได้) ฟังก์ชันนี้ถามผลจนจบ
 * ล้มเหลวโยน ApiError ด้วย status เดียวกับที่เซิร์ฟเวอร์ตอบ ผู้เรียกจึงจัดการแบบเดียวกันไม่ว่าจะล้มตอนไหน
 * ขนาดไม่ใหญ่ขึ้นหรือเล็กเกินไป 400 · เครดิตหมด 402 · แอดมินปิด 403 · งานหาย (เซิร์ฟเวอร์เริ่มใหม่) 404
 * คิวเต็มหรือ Replicate แน่น 429 · Replicate ใช้ไม่ได้ 503 · เน็ตหลุดนานจนไม่รู้ผล 0
 *
 * requestId คือ id ของงานที่หน้าเว็บตั้งเอง ใช้ id เดิมทุกครั้งที่ส่งรูปเดิม (รวมตอนกดลองใหม่)
 * เซิร์ฟเวอร์ที่รับงานนั้นไปแล้วตอบงานเดิม ที่สำเร็จแล้วตอบผลเดิม ไม่ทำและไม่ตัดเครดิตซ้ำ
 * คำตอบหายเพราะเน็ตหลุดจึงส่งซ้ำได้เลย ไม่ต้องกลัวเสียเครดิตสองครั้ง
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
  let job = await startUpscale(input)
  onStarted?.(job)
  const deadline = Date.now() + MAX_WAIT
  while (job.status === 'processing') {
    if (Date.now() >= deadline) throw new ApiError(i18n.t('upscale.timeout'), 0)
    await wait(POLL_INTERVAL)
    try {
      job = await apiGet<UpscaleJob>(`/upscale/jobs/${job.id}`)
    } catch (error) {
      /*
        404 = เซิร์ฟเวอร์เริ่มใหม่กลางงาน งานหายและไม่ได้ตัดเครดิต (งานที่สำเร็จแล้วเซิร์ฟเวอร์ยังหาเจอ)
        อย่างอื่น (เน็ตสะดุด ต่ออายุ token ไม่ทัน เซิร์ฟเวอร์ตอบช้า) งานยังทำต่อบนเซิร์ฟเวอร์ ถามใหม่รอบหน้า
        เลิกถามตอนนี้ไม่ได้ งานอาจสำเร็จและตัดเครดิตไปแล้วโดยที่หน้าเว็บขึ้นว่าไม่สำเร็จ
      */
      if (error instanceof ApiError && error.status === 404) throw error
    }
  }
  if (job.status === 'done' && job.item) return job.item
  // งานเบื้องหลังล้มเหลว ใช้กติกาเดียวกับคำตอบ error ของ HTTP (ดู interceptor ใน client.ts)
  const code = job.error?.code ?? ''
  const message =
    code === MAINTENANCE_CODE ? i18n.t('errors.maintenance') : (job.error?.message ?? i18n.t('upscale.failed'))
  throw new ApiError(message, job.error?.status ?? 500, code)
}

/**
 * ส่งงาน เน็ตหลุด หมดเวลารอ หรือเซิร์ฟเวอร์ตอบพลาดชั่วคราว ส่งซ้ำเองด้วย requestId เดิมจนครบ START_RETRY_WINDOW
 * คำขอแรกอาจถึงเซิร์ฟเวอร์แล้วแค่คำตอบหาย ส่งซ้ำก็ได้งานเดิม ไม่เกิดงานซ้อน
 */
async function startUpscale(input: Parameters<typeof upscaleImage>[0]): Promise<UpscaleJob> {
  const deadline = Date.now() + START_RETRY_WINDOW
  for (let attempt = 1; ; attempt++) {
    try {
      return await apiPost<UpscaleJob>('/upscale', input, { timeout: START_TIMEOUT })
    } catch (error) {
      if (!canResend(error) || Date.now() >= deadline) throw error
      await wait(Math.min(2_000 * attempt, 8_000))
    }
  }
}

/** ส่งไม่ถึงหรือไม่ได้คำตอบ (0, ออฟไลน์) หรือเซิร์ฟเวอร์และ proxy พลาดชั่วคราว 500/502/504 (503 = ยังไม่ได้ตั้งค่า ส่งซ้ำไม่ช่วย) */
function canResend(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 0 || error.code === OFFLINE_CODE || [500, 502, 504].includes(error.status)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchUpscales(
  query: UpscaleQuery = {},
): Promise<{ items: UpscaleResult[]; pagination: Pagination }> {
  return apiGetPaginated<UpscaleResult[]>('/upscale', { params: query })
}

export async function deleteUpscale(id: string): Promise<void> {
  await apiDelete(`/upscale/${id}`)
}
