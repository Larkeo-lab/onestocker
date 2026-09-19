import i18n from '@/config/i18n'
import { OFFLINE_CODE } from '@/lib/network'

import { ApiError, MAINTENANCE_CODE, apiGet, apiPost } from './client'

/*
  งานที่เซิร์ฟเวอร์ทำเบื้องหลัง (ลบพื้นหลัง อัปสเกล) รูปใหญ่ใช้นานกว่าที่คำขอเดียวรอได้
  (เซิร์ฟเวอร์ตัดที่ 90 วินาที Cloudflare ตัดที่ 100) จึงส่งงานแล้วถามผลเป็นระยะจนจบ

  requestId คือ id ของงานที่หน้าเว็บตั้งเอง ใช้ id เดิมทุกครั้งที่ส่งรูปเดิม (รวมตอนกดลองใหม่)
  เซิร์ฟเวอร์ที่รับงานนั้นไปแล้วตอบงานเดิม ที่สำเร็จแล้วตอบผลเดิม ไม่ทำและไม่ตัดเครดิตซ้ำ
  คำตอบหายเพราะเน็ตหลุดจึงส่งซ้ำได้เลย ไม่ต้องกลัวเสียเครดิตสองครั้ง
*/

/** งานเบื้องหลังหนึ่งงาน ต้องตรงกับ Job ใน feature removebg และ upscale ฝั่ง Go */
export type BackgroundJob<T> = {
  id: string
  status: 'processing' | 'done' | 'failed'
  item?: T
  /** code เช่น MAINTENANCE_CODE ไม่มี = ดูจาก status */
  error?: { status: number; code?: string; message: string }
}

/** เวลารอคำตอบตอนส่งงาน */
const START_TIMEOUT = 30_000

/** เน็ตหลุดตอนส่งงาน ส่งซ้ำเองได้นานสุดเท่านี้ ส่งซ้ำด้วย requestId เดิมปลอดภัย */
const START_RETRY_WINDOW = 2 * 60_000

/** ถามสถานะงานทุกเท่านี้ งานหนึ่งใช้หลายวินาทีถึงนาที ถามถี่กว่านี้ก็ไม่ได้ผลเร็วขึ้น */
const POLL_INTERVAL = 2_000

/**
 * รอผลนานสุดเท่านี้ เซิร์ฟเวอร์จบทุกงานภายในเพดานของตัวเอง (ลบพื้นหลัง 10 นาที อัปสเกลราว 6 นาที)
 * เกินนี้คือเน็ตหลุดนานจนไม่รู้ผล ผู้ใช้กดลองใหม่ได้ปลอดภัย
 */
const MAX_WAIT = 15 * 60_000

/**
 * ส่งงานแล้วรอจนจบ คืนผลลัพธ์ของงาน
 *
 * ล้มเหลวโยน ApiError ด้วย status เดียวกับที่เซิร์ฟเวอร์ตอบ ผู้เรียกจึงจัดการแบบเดียวกันไม่ว่าจะล้มตอนไหน
 * งานหาย (เซิร์ฟเวอร์เริ่มใหม่กลางงาน ไม่ได้ตัดเครดิต) 404 · เน็ตหลุดนานจนไม่รู้ผล 0 (ข้อความ lostMessage)
 */
export async function runJob<T, J extends BackgroundJob<T> = BackgroundJob<T>>(options: {
  /** เส้นที่ POST ส่งงาน */
  startPath: string
  /** เส้นที่ GET ถามสถานะงาน */
  jobPath: (id: string) => string
  body: { requestId: string }
  /** เซิร์ฟเวอร์รับงานแล้ว ต่อจากนี้คือรอผล */
  onStarted?: (job: J) => void
  /** งานล้มเหลวโดยเซิร์ฟเวอร์ไม่ได้บอกข้อความ */
  failedMessage: string
  /** เน็ตหลุดนานจนไม่รู้ผล */
  lostMessage: string
}): Promise<T> {
  let job = await start<J>(options.startPath, options.body)
  options.onStarted?.(job)
  const deadline = Date.now() + MAX_WAIT
  while (job.status === 'processing') {
    if (Date.now() >= deadline) throw new ApiError(options.lostMessage, 0)
    await wait(POLL_INTERVAL)
    try {
      job = await apiGet<J>(options.jobPath(job.id))
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
  // ใช้กติกาเดียวกับคำตอบ error ของ HTTP (ดู interceptor ใน client.ts)
  const code = job.error?.code ?? ''
  const message = code === MAINTENANCE_CODE ? i18n.t('errors.maintenance') : (job.error?.message ?? options.failedMessage)
  throw new ApiError(message, job.error?.status ?? 500, code)
}

/**
 * ส่งงาน เน็ตหลุด หมดเวลารอ หรือเซิร์ฟเวอร์ตอบพลาดชั่วคราว ส่งซ้ำเองด้วย requestId เดิมจนครบ START_RETRY_WINDOW
 * คำขอแรกอาจถึงเซิร์ฟเวอร์แล้วแค่คำตอบหาย ส่งซ้ำก็ได้งานเดิม ไม่เกิดงานซ้อน
 */
async function start<J>(path: string, body: { requestId: string }): Promise<J> {
  const deadline = Date.now() + START_RETRY_WINDOW
  for (let attempt = 1; ; attempt++) {
    try {
      return await apiPost<J>(path, body, { timeout: START_TIMEOUT })
    } catch (error) {
      if (!canResend(error) || Date.now() >= deadline) throw error
      await wait(Math.min(2_000 * attempt, 8_000))
    }
  }
}

/** ส่งไม่ถึงหรือไม่ได้คำตอบ (0, ออฟไลน์) หรือเซิร์ฟเวอร์และ proxy พลาดชั่วคราว 500/502/504 (503 = ปิดปรับปรุงหรือใช้ไม่ได้ ส่งซ้ำไม่ช่วย) */
function canResend(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 0 || error.code === OFFLINE_CODE || [500, 502, 504].includes(error.status)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
