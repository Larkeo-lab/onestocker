import i18n from '@/config/i18n'
import { choiceRequest, type VideoChoice } from '@/lib/videoFormats'
import type { AnimationBatch, AnimationJob, AnimationResult } from '@/types/animation'

import { apiDelete, apiGet, apiGetPaginated, apiPost, type Pagination } from './client'
import { runJob } from './jobs'

/* เส้นทั้งหมดต้องตรงกับ server/internal/feature/animation/router.go */

/** ต้องตรงกับ MaxVideoBytes ใน server/internal/feature/animation/service.go */
export const ANIMATION_MAX_MB = 50

/** วิดีโอหรือรูปตัวอย่าง ต้องตรงกับ referenceTypes ใน service.go รูปนิ่ง AI คิดการเคลื่อนไหวให้เอง */
export const ANIMATION_ACCEPT = 'video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp'

/** จำนวนคลิปที่เลือกได้ต่อหนึ่งวิดีโอ ต้องตรงกับ MaxClips ใน service.go */
export const ANIMATION_MAX_CLIPS = 4

/** ความยาวคลิปที่เลือกได้ (วินาที) ต้องตรงกับ MinSeconds / MaxSeconds ใน service.go */
export const ANIMATION_MIN_SECONDS = 5
export const ANIMATION_MAX_SECONDS = 30
export const ANIMATION_DEFAULT_SECONDS = 10

/**
 * รอผลนานสุดเท่านี้ คลิปหนึ่งใช้หลายนาที (Gemini คิดนาน render ทีละเฟรม) และอาจต้องรอคิว render ของคนอื่น
 * มากกว่า jobTimeout ใน service.go (15 นาที + 30 นาทีต่อคลิป) อยู่ 5 นาที
 */
function maxWait(count: number): number {
  return (20 + 30 * count) * 60_000
}

export async function requestAnimationUpload(file: File): Promise<{ key: string; url: string }> {
  return apiPost<{ key: string; url: string }>('/animation/uploads', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  })
}

/**
 * สร้างแอนิเมชัน count คลิปจากวิดีโอตัวอย่างที่อัปแล้ว รอจนได้ MP4 ครบ
 * onProgress ได้งานทุกครั้งที่ถาม มีคำบรรยายและโค้ดให้แสดงก่อน render เสร็จ
 * resume = งานที่ส่งไปแล้วก่อนรีเฟรชหน้า ถามสถานะต่อโดยไม่ส่งใหม่
 */
export async function makeAnimation(
  input: { requestId: string; uploadKey: string; filename: string; count: number },
  onProgress: (job: AnimationJob) => void,
  resume = false,
): Promise<AnimationBatch> {
  return runJob<AnimationBatch, AnimationJob>({
    startPath: '/animation',
    jobPath: (id) => `/animation/jobs/${id}`,
    body: input,
    resume,
    onStarted: onProgress,
    onProgress,
    maxWait: maxWait(input.count),
    failedMessage: i18n.t('animation.failed'),
    lostMessage: i18n.t('animation.timeout'),
  })
}

/** ขนาดโค้ดที่วางให้ render เองได้ ต้องตรงกับ MaxHTMLBytes ใน service.go */
export const ANIMATION_MAX_CODE_KB = 512

/** ค่า model ของคลิปที่ render จากโค้ดที่วางเอง ต้องตรงกับ ManualModel ใน service.go */
export const MANUAL_MODEL = 'manual'

/**
 * render โค้ด HTML ที่วางเองเป็น MP4 ไม่ผ่าน AI ถามความคืบหน้าที่เส้นเดียวกับ makeAnimation
 * resume = งานที่ส่งไปแล้วก่อนรีเฟรชหน้า ถามสถานะต่อโดยไม่ส่งใหม่
 */
export async function renderAnimationCode(
  input: {
    requestId: string
    html: string
    filename: string
    format: VideoChoice['format']
    fps: VideoChoice['fps']
    seconds: number
    resolution?: number
    background?: string
    quality?: string
  },
  onProgress: (job: AnimationJob) => void,
  resume = false,
): Promise<AnimationBatch> {
  return runJob<AnimationBatch, AnimationJob>({
    startPath: '/animation/render',
    jobPath: (id) => `/animation/jobs/${id}`,
    body: input,
    resume,
    onStarted: onProgress,
    onProgress,
    // เซิร์ฟเวอร์ตัดที่ 30 นาที (renderTimeout)
    maxWait: 35 * 60_000,
    failedMessage: i18n.t('animation.render.failed'),
    lostMessage: i18n.t('animation.timeout'),
  })
}

/**
 * render วิดีโอแบบที่เลือก (ชนิดไฟล์ × fps × ความยาว) ของคลิปที่บันทึกไว้ (สร้างแล้วยังไม่ render จนกดดาวน์โหลด)
 * เซิร์ฟเวอร์ตั้ง id ของงานจากคลิปกับแบบที่เลือก กดซ้ำระหว่าง render ได้งานเดิม render แล้วได้ผลทันที
 * resume = ถามสถานะงาน jobId ต่อหลังรีเฟรช ไม่ส่งใหม่
 */
export async function renderAnimationVideo(
  input: { id: string; choice: VideoChoice; jobId?: string },
  onProgress: (job: AnimationJob) => void,
  resume = false,
): Promise<AnimationResult> {
  const batch = await runJob<AnimationBatch, AnimationJob>({
    startPath: `/animation/${input.id}/video`,
    jobPath: (jobId) => `/animation/jobs/${jobId}`,
    body: { requestId: input.jobId ?? input.id, ...choiceRequest(input.choice) },
    resume,
    onStarted: onProgress,
    onProgress,
    // เซิร์ฟเวอร์ตัดที่ 30 นาที (renderTimeout)
    maxWait: 35 * 60_000,
    failedMessage: i18n.t('animation.video.failed'),
    lostMessage: i18n.t('animation.timeout'),
  })
  return batch.items[0]
}

/** ประวัติ ใหม่ไปเก่า ไม่มีโค้ด (html) ขอทีละรายการด้วย fetchAnimation */
export async function fetchAnimations(
  query: { page?: number; limit?: number } = {},
): Promise<{ items: AnimationResult[]; pagination: Pagination }> {
  return apiGetPaginated<AnimationResult[]>('/animation', { params: query })
}

/** รายการเดียวพร้อมโค้ด */
export async function fetchAnimation(id: string): Promise<AnimationResult> {
  return apiGet<AnimationResult>(`/animation/${id}`)
}

export async function deleteAnimation(id: string): Promise<void> {
  await apiDelete(`/animation/${id}`)
}

/** รหัสของงานที่ลูกค้าสั่งหยุดเอง ต้องตรงกับ CodeCancelled ใน jobs.go */
export const CANCELLED_CODE = 'ANIMATION-CANCELLED'

/** หยุดงานที่ยังทำอยู่ (สร้าง หรือ render) งานจบด้วย CANCELLED_CODE คลิปที่บันทึกแล้วยังอยู่ในประวัติ */
export async function cancelAnimationJob(id: string): Promise<void> {
  await apiPost(`/animation/jobs/${id}/cancel`, {})
}
