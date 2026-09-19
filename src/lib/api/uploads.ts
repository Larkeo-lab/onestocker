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

/**
 * อัปขึ้น R2 ตรง ๆ ไม่ผ่าน Go API
 *
 * ใช้ axios เปล่า ไม่ใช่ instance `api` โดยตั้งใจ เพราะ presigned URL
 * จะใช้ไม่ได้ถ้ามี header Authorization ติดไปด้วย (ลายเซ็นไม่ตรง)
 * และคำตอบของ R2 ไม่ได้อยู่ในรูป envelope ของ Go API
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
  try {
    await axios.put(url, file, {
      headers: { 'Content-Type': file.type },
      signal,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(uploadErrorMessage(error))
  }
}

/**
 * แปลงความล้มเหลวตอนอัปให้เป็นข้อความที่บอกทางแก้ได้
 *
 * เบราว์เซอร์ไม่ยอมบอก JS ว่าคำขอถูกบล็อกเพราะ CORS มันโผล่มาเป็น
 * network error เปล่า ๆ แยกไม่ออกจากเน็ตหลุด แต่ในทางปฏิบัติ
 * สาเหตุที่พบบ่อยที่สุดคือโดเมนที่เปิดอยู่ไม่ได้อยู่ใน CORS policy ของ bucket
 * ถ้าไม่บอกไว้ ผู้ใช้จะเห็นแค่รูปหายไปเฉย ๆ โดยไม่รู้ว่าต้องไปแก้ตรงไหน
 */
function uploadErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : i18n.t('errors.uploadFailed')
  }

  const status = error.response?.status
  if (status === undefined) {
    // เน็ตหลุดก็โผล่มาเป็น network error เหมือนกัน ถ้าไม่แยกไว้จะบอกผู้ใช้ผิดว่าโดน CORS
    if (!navigator.onLine) return i18n.t('errors.offline')
    return i18n.t('errors.uploadCors', { origin: window.location.origin })
  }
  if (status === 403) {
    return i18n.t('errors.uploadForbidden')
  }
  return i18n.t('errors.uploadStatus', { status })
}
