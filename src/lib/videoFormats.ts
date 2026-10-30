import { useCallback, useState } from 'react'

import { ANIMATION_MAX_SECONDS } from '@/lib/api/animation'
import type { AnimationResult } from '@/types/animation'

/**
 * ชนิดไฟล์วิดีโอที่เลือกได้ตอนดาวน์โหลดแอนิเมชัน ต้องตรงกับ render.Format ใน server/internal/render
 *
 *   mp4           H.264 ไฟล์เล็ก ใช้ได้ทุกที่
 *   prores        MOV ProRes 422 HQ คุณภาพสูง ที่เว็บ stock แนะนำ ไฟล์ใหญ่
 *   prores_alpha  MOV ProRes 4444 พื้นหลังโปร่งใส
 */
export const VIDEO_FORMATS = ['mp4', 'prores', 'prores_alpha'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

/**
 * เฟรมต่อวินาทีที่เลือกได้ ต้องตรงกับ render.FPSOptions คลิปยาว 10 วินาทีเท่าเดิม
 * 120 render นานราวสองเท่าของ 60 และไฟล์ใหญ่ขึ้นตาม
 */
export const VIDEO_FPS = [24, 25, 30, 50, 60, 120] as const
export type VideoFps = (typeof VIDEO_FPS)[number]

/** ความละเอียดไฟล์ (ความสูง) ต้องตรงกับ render.Resolutions เลย์เอาต์ยัง 1920×1080 เครื่อง render วาดที่ความละเอียดนี้จริง */
export const VIDEO_RESOLUTIONS = [1080, 1440, 2160] as const
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number]

/** คุณภาพการบีบอัดของ MP4 ต้องตรงกับ render.Quality ProRes คุณภาพคงที่ */
export const VIDEO_QUALITIES = ['standard', 'high', 'max', 'lossless'] as const
export type VideoQuality = (typeof VIDEO_QUALITIES)[number]

/** สีพื้นหลังสำเร็จรูป '' = ตามโค้ด เลือกสีอื่นเองได้ (#rrggbb) */
export const BACKGROUND_PRESETS = ['', '#000000', '#ffffff', '#00b140'] as const

/**
 * ไฟล์ที่จะดาวน์โหลด แต่ละแบบ render แยกกันเมื่อมีคนกด ต้องตรงกับ VideoRequest / videoSpec ใน server
 * seconds ไม่มีหรือใช้กับคลิปนั้นไม่ได้ = ยาวเท่าคลิป (ดู lengthFor)
 * resolution / background / quality ไม่มี = ค่าตั้งต้น (ดู effectiveOptions)
 */
export type VideoChoice = {
  format: VideoFormat
  fps: VideoFps
  seconds?: number
  resolution?: VideoResolution
  /** '#rrggbb' หรือ '' = ตามโค้ด */
  background?: string
  quality?: VideoQuality
}

/**
 * ค่าที่ใช้จริงของ resolution / background / quality ตามกติกาเดียวกับ specOf ใน server
 * แบบโปร่งใสไม่มีสีพื้นหลัง ProRes ไม่มีระดับคุณภาพ ('' ทั้งคู่)
 */
export function effectiveOptions(choice: VideoChoice): { resolution: number; background: string; quality: string } {
  return {
    resolution: choice.resolution ?? 1080,
    background: choice.format === 'prores_alpha' ? '' : (choice.background ?? ''),
    quality: choice.format === 'mp4' ? (choice.quality ?? 'high') : '',
  }
}

/** ค่าที่ส่งให้ API (POST /animation/:id/video และ /animation/render) */
export function choiceRequest(choice: VideoChoice) {
  const { resolution, background, quality } = effectiveOptions(choice)
  return { format: choice.format, fps: choice.fps, seconds: choice.seconds, resolution, background, quality }
}

const COLOR = /^#[0-9a-f]{6}$/i

const DEFAULT_CHOICE: VideoChoice = { format: 'mp4', fps: 60 }
const CHOICE_KEY = 'animation.videoChoice'

function readChoice(): VideoChoice {
  try {
    const saved = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null') as Partial<VideoChoice> | null
    return {
      format: VIDEO_FORMATS.includes(saved?.format as VideoFormat) ? (saved!.format as VideoFormat) : DEFAULT_CHOICE.format,
      fps: VIDEO_FPS.includes(saved?.fps as VideoFps) ? (saved!.fps as VideoFps) : DEFAULT_CHOICE.fps,
      seconds: typeof saved?.seconds === 'number' ? saved.seconds : undefined,
      resolution: VIDEO_RESOLUTIONS.includes(saved?.resolution as VideoResolution) ? saved!.resolution : undefined,
      background: typeof saved?.background === 'string' && (saved.background === '' || COLOR.test(saved.background)) ? saved.background : undefined,
      quality: VIDEO_QUALITIES.includes(saved?.quality as VideoQuality) ? saved!.quality : undefined,
    }
  } catch {
    return DEFAULT_CHOICE
  }
}

/** แบบที่เลือกไว้ จำข้ามหน้าและข้ามการเปิดใหม่ (localStorage ใช้ไม่ได้ก็แค่ไม่จำ) */
export function useVideoChoice(): [VideoChoice, (choice: VideoChoice) => void] {
  const [choice, setChoice] = useState(readChoice)
  const update = useCallback((next: VideoChoice) => {
    setChoice(next)
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify(next))
    } catch {
      // ดูหมายเหตุใน readChoice
    }
  }, [])
  return [choice, update]
}

/**
 * ความยาวที่ดาวน์โหลดได้ของคลิปที่ลูปยาว clipSeconds วินาที: ผลคูณของลูปไม่เกิน ANIMATION_MAX_SECONDS
 * ลูปซ้ำจึงต่อกันสนิท เช่นลูป 10 วินาทีได้ 10 / 20 / 30 ต้องตรงกับ loopSeconds ใน service.go
 */
export function downloadLengths(clipSeconds: number): number[] {
  const lengths = [clipSeconds]
  for (let seconds = clipSeconds * 2; seconds <= ANIMATION_MAX_SECONDS; seconds += clipSeconds) lengths.push(seconds)
  return lengths
}

/** ความยาวที่จะดาวน์โหลดของคลิปนี้ ที่เลือกไว้ใช้กับคลิปนี้ไม่ได้ (คลิปลูปยาวต่างกัน) ก็ยาวเท่าคลิป */
export function lengthFor(item: Pick<AnimationResult, 'seconds'>, choice: VideoChoice): number {
  return choice.seconds && downloadLengths(item.seconds).includes(choice.seconds) ? choice.seconds : item.seconds
}

/** ลิงก์ดาวน์โหลดของไฟล์แบบที่เลือก ไม่มี = ยังไม่ได้ render แบบนั้น */
export function videoUrlFor(item: AnimationResult, choice: VideoChoice): string | undefined {
  const seconds = lengthFor(item, choice)
  const wanted = effectiveOptions(choice)
  return item.videos?.find(
    (video) =>
      video.format === choice.format &&
      video.fps === choice.fps &&
      (video.seconds ?? item.seconds) === seconds &&
      (video.resolution ?? 1080) === wanted.resolution &&
      (video.background ?? '') === wanted.background &&
      (video.quality ?? (video.format === 'mp4' ? 'high' : '')) === wanted.quality,
  )?.url
}
