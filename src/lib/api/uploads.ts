import axios from 'axios'

import i18n from '@/config/i18n'

import { apiPost } from './client'

/**
 * preview = รูปย่อที่อยู่ถาวรให้หน้า History
 * frame = เฟรมจากวิดีโอ ใช้แค่ตอนส่งให้โมเดลดู เก็บแยกโฟลเดอร์ให้ลบเองได้
 */
export type UploadPurpose = 'preview' | 'frame'

export type PresignItem = {
  filename: string
  contentType: string
  purpose: UploadPurpose
}

export type PresignedUpload = {
  /** ตำแหน่งไฟล์บน R2 ส่งค่านี้กลับไปตอนเรียก generate */
  key: string
  /** URL ที่อัปได้โดยตรงโดยไม่ต้องผ่าน Go API */
  url: string
}

/**
 * ขอ presigned URL ทีเดียวหลายไฟล์ ประหยัดกว่ายิงทีละรูป
 *
 * แบ่งเป็นหลายคำขอเมื่อเกินเพดานต่อคำขอของเซิร์ฟเวอร์ — วิดีโอหนึ่งคลิป
 * ใช้หลายลิงก์ (รูปย่อหนึ่ง + ทุกเฟรม) ใส่วิดีโอไม่กี่คลิปก็เกินเพดานแล้ว
 * ผลลัพธ์ยังเรียงตามลำดับที่ส่งไปเหมือนเดิม
 */
export async function requestUploadUrls(
  items: PresignItem[],
  maxPerRequest: number,
): Promise<PresignedUpload[]> {
  // กันเพดานเป็น 0 ไม่งั้นลูปไม่ขยับและค้างตลอดไป
  const size = Math.max(1, maxPerRequest)
  const uploads: PresignedUpload[] = []
  for (let start = 0; start < items.length; start += size) {
    const result = await apiPost<{ uploads: PresignedUpload[] }>(
      '/uploads/presign',
      { items: items.slice(start, start + size) },
    )
    uploads.push(...result.uploads)
  }
  return uploads
}

/** เน็ตสะดุดกลางทางเกิดได้เสมอ โดยเฉพาะบนมือถือ อัปใหม่เองก่อนจะไปบอกผู้ใช้ว่าไม่สำเร็จ */
const UPLOAD_ATTEMPTS = 3

/**
 * อัปขึ้น R2 ตรง ๆ ไม่ผ่าน Go API
 *
 * ใช้ axios เปล่า ไม่ใช่ instance `api` โดยตั้งใจ เพราะ presigned URL
 * จะใช้ไม่ได้ถ้ามี header Authorization ติดไปด้วย (ลายเซ็นไม่ตรง)
 * และคำตอบของ R2 ไม่ได้อยู่ในรูป envelope ของ Go API
 *
 * ลิงก์เดิมอัปซ้ำได้ ไฟล์ถูกเขียนทับที่ key เดิม จึงลองใหม่ได้โดยไม่เกิดไฟล์ซ้ำ
 *
 * signal ใช้หยุดกลางทางเมื่อผู้ใช้กดยกเลิก ตอนนั้นโยน error เดิมของ axios ออกไป ไม่แปลงเป็นข้อความ
 * (ไม่งั้นจะดูเหมือนโดน CORS บล็อก) ผู้เรียกดู signal.aborted เองว่าเป็นการยกเลิก
 */
export async function uploadToR2(
  url: string,
  file: Blob,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await axios.put(url, file, {
        headers: { 'Content-Type': file.type },
        signal,
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return
          onProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      return
    } catch (error) {
      if (signal?.aborted) throw error
      if (attempt >= UPLOAD_ATTEMPTS || !worthRetrying(error)) {
        throw new Error(uploadErrorMessage(error))
      }
      // เริ่มนับใหม่จากศูนย์ ไม่งั้นแถบความคืบหน้าเดินถอยหลังตอนอัปรอบใหม่
      onProgress?.(0)
      await sleep(1_000 * attempt)
    }
  }
}

/**
 * ลองใหม่เฉพาะตอนที่ยังไม่รู้ผล (เน็ตสะดุด หมดเวลา) หรือ R2 พลาดชั่วคราว
 * ไฟล์ที่ R2 ปฏิเสธ (ลิงก์หมดอายุ ลายเซ็นไม่ตรง) อัปใหม่ด้วยลิงก์เดิมก็ไม่ผ่าน
 */
function worthRetrying(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === undefined || status >= 500
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * แปลงความล้มเหลวตอนอัปให้เป็นข้อความที่บอกทางแก้ได้
 *
 * เบราว์เซอร์ไม่ยอมบอก JS ว่าคำขอถูกบล็อกเพราะ CORS มันโผล่มาเป็น network error เปล่า ๆ
 * แยกไม่ออกจากเน็ตหลุด สำหรับลูกค้าสาเหตุที่เจอจริงเกือบทั้งหมดคือเน็ตสะดุด (อัปใหม่แล้วผ่าน)
 * จึงบอกแบบนั้น ส่วนกรณีตั้งค่าโดเมนผิดเขียนไว้ใน console ให้คนดูแลระบบเห็นแทน
 */
function uploadErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : i18n.t('errors.uploadFailed')
  }

  const status = error.response?.status
  if (status === undefined) {
    if (!navigator.onLine) return i18n.t('errors.offline')
    console.warn(
      `อัปขึ้น R2 ไม่สำเร็จจาก ${window.location.origin} — ถ้าไม่ผ่านทุกไฟล์ทุกครั้ง ให้ตรวจว่าโดเมนนี้อยู่ใน CORS policy ของ bucket`,
    )
    return i18n.t('errors.uploadLost')
  }
  if (status === 403) {
    return i18n.t('errors.uploadForbidden')
  }
  return i18n.t('errors.uploadStatus', { status })
}
