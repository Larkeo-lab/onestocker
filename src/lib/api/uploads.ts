import axios from 'axios'

import i18n from '@/config/i18n'
import { VECTOR_CONTENT_TYPE } from '@/lib/media'

import { ApiError, apiPost } from './client'

/**
 * preview = รูปย่อที่อยู่ถาวรให้หน้า History
 * frame = เฟรมจากวิดีโอ ใช้แค่ตอนส่งให้โมเดลดู เก็บแยกโฟลเดอร์ให้ลบเองได้
 * source = ไฟล์ต้นฉบับที่เบราว์เซอร์เปิดไม่ได้ (EPS) เซิร์ฟเวอร์แปลงแล้วลบทิ้ง
 */
export type UploadPurpose = 'preview' | 'frame' | 'source'

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

/** รูปย่อที่เซิร์ฟเวอร์แปลงจากไฟล์เวกเตอร์ให้ ตรงกับ VectorResponse ฝั่ง Go */
export type VectorPreview = {
  /** ตำแหน่งรูปย่อบน R2 ส่งต่อให้ generate ได้เหมือนรูปที่อัปมาตรง ๆ */
  previewKey: string
  /** ลิงก์ดูรูปชั่วคราว ใช้แสดงในการ์ด เพราะไม่มีไฟล์ในเครื่องให้แสดง */
  previewUrl: string
  width: number
  height: number
}

/**
 * เพดานขนาดไฟล์ EPS ต้องไม่เกิน MaxSourceBytes ใน server/internal/shared/vector
 *
 * ตรวจก่อนอัป ไม่ใช่ปล่อยให้เซิร์ฟเวอร์ปฏิเสธทีหลัง — ไฟล์ขนาดนี้ใช้เวลาอัปเป็นนาที
 * บนเน็ตมือถือ เสียเวลารอฟรีแล้วค่อยบอกว่าใหญ่เกินเป็นประสบการณ์ที่แย่กว่ามาก
 */
const VECTOR_MAX_MB = 64

/**
 * อัปไฟล์เวกเตอร์แล้วให้เซิร์ฟเวอร์แปลงเป็นรูป
 *
 * EPS เป็นภาษา PostScript เบราว์เซอร์วาดเองไม่ได้เลย ต่างจากรูปและวิดีโอที่ย่อ
 * ในเครื่องผู้ใช้ได้ ไฟล์นี้จึงต้องขึ้นไปทั้งก้อน — ขึ้น R2 ตรง ๆ ไม่ผ่าน Go API
 * เพราะเครื่องเล็กรับไฟล์ใหญ่พร้อมกันหลายคนไม่ไหว แล้วค่อยบอกเซิร์ฟเวอร์ให้ไปแปลง
 *
 * ต้นฉบับถูกลบทิ้งทันทีที่แปลงเสร็จ เหลือไว้แต่รูปย่อ
 */
export async function uploadVector(
  file: Blob,
  filename: string,
  onProgress?: (percent: number) => void,
): Promise<VectorPreview> {
  if (file.size > VECTOR_MAX_MB * 1024 * 1024) {
    throw new Error(i18n.t('errors.vectorTooLarge', { max: VECTOR_MAX_MB }))
  }

  const [link] = await requestUploadUrls(
    [{ filename, contentType: VECTOR_CONTENT_TYPE, purpose: 'source' }],
    1,
  )
  if (!link) throw new Error(i18n.t('errors.noUploadUrl'))

  /*
    slice คืน Blob ก้อนเดิมที่ติดป้ายชนิดใหม่ ไม่ได้คัดลอกข้อมูล

    จำเป็นเพราะแต่ละระบบปฏิบัติการบอกชนิดของ .eps ไม่เหมือนกัน บางเครื่องไม่บอกเลย
    แต่ลิงก์ถูกเซ็นด้วยชนิดที่เราประกาศไว้ ถ้าส่งไม่ตรง R2 ตอบ 403
  */
  await uploadToR2(
    link.url,
    file.slice(0, file.size, VECTOR_CONTENT_TYPE),
    onProgress,
  )

  try {
    return await apiPost<VectorPreview>('/uploads/vector-preview', {
      key: link.key,
      filename,
    })
  } catch (error) {
    /*
      400 จากเส้นนี้แปลว่าเซิร์ฟเวอร์วาดไฟล์นี้ไม่ออก (ขนาดถูกกรองไปแล้วด้านบน)
      ข้อความจากเซิร์ฟเวอร์เป็นภาษาอังกฤษอย่างเดียว เปลี่ยนเป็นภาษาของผู้ใช้
      เพราะเป็นกรณีที่ลูกค้าเจอเองได้บ่อยและแก้เองได้
    */
    if (error instanceof ApiError && error.status === 400) {
      throw new Error(i18n.t('errors.vectorUnreadable'))
    }
    throw error
  }
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
