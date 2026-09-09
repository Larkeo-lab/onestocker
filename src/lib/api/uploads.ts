import axios from 'axios'

import { apiPost } from './client'

export type PresignItem = {
  filename: string
  contentType: string
}

export type PresignedUpload = {
  /** ตำแหน่งไฟล์บน R2 ส่งค่านี้กลับไปตอนเรียก generate */
  key: string
  /** URL ที่อัปได้โดยตรงโดยไม่ต้องผ่าน Go API */
  url: string
}

/** ขอ presigned URL ทีเดียวหลายไฟล์ ประหยัดกว่ายิงทีละรูป */
export async function requestUploadUrls(
  items: PresignItem[],
): Promise<PresignedUpload[]> {
  const result = await apiPost<{ uploads: PresignedUpload[] }>(
    '/uploads/presign',
    { items },
  )
  return result.uploads
}

/**
 * อัปขึ้น R2 ตรง ๆ ไม่ผ่าน Go API
 *
 * ใช้ axios เปล่า ไม่ใช่ instance `api` โดยตั้งใจ เพราะ presigned URL
 * จะใช้ไม่ได้ถ้ามี header Authorization ติดไปด้วย (ลายเซ็นไม่ตรง)
 * และคำตอบของ R2 ไม่ได้อยู่ในรูป envelope ของ Go API
 */
export async function uploadToR2(
  url: string,
  file: Blob,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await axios.put(url, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}
