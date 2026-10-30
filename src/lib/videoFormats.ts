import { useCallback, useState } from 'react'

/**
 * ชนิดไฟล์วิดีโอที่เลือกได้ตอนดาวน์โหลดแอนิเมชัน ต้องตรงกับ render.Format ใน server/internal/render
 *
 *   mp4           H.264 ไฟล์เล็ก ใช้ได้ทุกที่
 *   prores        MOV ProRes 422 HQ คุณภาพสูง ที่เว็บ stock แนะนำ ไฟล์ใหญ่
 *   prores_alpha  MOV ProRes 4444 พื้นหลังโปร่งใส
 */
export const VIDEO_FORMATS = ['mp4', 'prores', 'prores_alpha'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

const FORMAT_KEY = 'animation.format'

function readFormat(): VideoFormat {
  try {
    const saved = localStorage.getItem(FORMAT_KEY)
    return VIDEO_FORMATS.includes(saved as VideoFormat) ? (saved as VideoFormat) : 'mp4'
  } catch {
    return 'mp4'
  }
}

/** แบบที่เลือกไว้ จำข้ามหน้าและข้ามการเปิดใหม่ (localStorage ใช้ไม่ได้ก็แค่ไม่จำ) */
export function useVideoFormat(): [VideoFormat, (format: VideoFormat) => void] {
  const [format, setFormat] = useState(readFormat)
  const update = useCallback((next: VideoFormat) => {
    setFormat(next)
    try {
      localStorage.setItem(FORMAT_KEY, next)
    } catch {
      // ดูหมายเหตุใน readFormat
    }
  }, [])
  return [format, update]
}
