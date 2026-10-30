import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ANIMATION_DEFAULT_SECONDS, ANIMATION_MAX_CODE_KB, ApiError, cancelAnimationJob, CANCELLED_CODE, renderAnimationCode } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/query'
import { videoUrlFor, type VideoChoice } from '@/lib/videoFormats'
import type { AnimationJob, AnimationResult } from '@/types/animation'

/*
  แท็บ "render โค้ด" ในหน้าแอนิเมชัน: วางโค้ด HTML เองแล้ว render เป็น MP4 ไม่ผ่าน AI

  อยู่นอกหน้าแบบเดียวกับ store/animation ไปหน้าอื่นแล้วกลับมาโค้ดกับงานยังอยู่
  โค้ดที่พิมพ์ค้างไว้จำใน localStorage (ปิดแท็บแล้วไม่หาย) งานที่ส่งแล้วจำ id ไว้ถามต่อหลังรีเฟรช
*/

export type RenderPhase =
  | { kind: 'idle' }
  | { kind: 'working'; job?: AnimationJob }
  | { kind: 'done'; result: AnimationResult; choice: VideoChoice }
  | { kind: 'failed'; message: string }

type Pending = {
  requestId: string
  html: string
  filename: string
  format: VideoChoice['format']
  fps: VideoChoice['fps']
  seconds: number
  // ไม่มี = งานค้างจากรุ่นก่อนมีตัวเลือกเหล่านี้ (ค่าตั้งต้น)
  resolution?: VideoChoice['resolution']
  background?: string
  quality?: VideoChoice['quality']
}

const DRAFT_KEY = 'animation.render.draft'
const PENDING_KEY = 'animation.render.pending'

type RenderState = {
  html: string
  filename: string
  /** ความยาวคลิป (วินาที) โค้ดที่วางควรวนลูปพอดีความยาวนี้ */
  seconds: number
  phase: RenderPhase
  setHtml: (html: string) => void
  setFilename: (filename: string) => void
  setSeconds: (seconds: number) => void
  /** render เป็นแบบที่เลือก (ชนิดไฟล์ × fps) แล้วดาวน์โหลดให้เอง */
  render: (choice: VideoChoice) => void
  resume: () => void
  /** กลับไปแก้โค้ดต่อ (โค้ดเดิมยังอยู่) */
  reset: () => void
  /** สั่งหยุดงาน render ที่ทำอยู่ เซิร์ฟเวอร์ยืนยันแล้วกลับไปแก้โค้ดต่อ */
  cancel: () => void
  cancelling: boolean
}

export const useRenderStore = create<RenderState>()((set, get) => {
  const busy = () => get().phase.kind === 'working'
  // id ของงานที่รอผลอยู่ ไว้สั่งหยุด
  let currentJob: string | null = null

  async function wait(pending: Pending, resume: boolean) {
    set({ phase: { kind: 'working' }, cancelling: false })
    currentJob = pending.requestId
    let seen = false
    try {
      const batch = await renderAnimationCode(
        pending,
        (job) => {
          seen = true
          set({ phase: { kind: 'working', job } })
        },
        resume,
      )
      const result = batch.items[0]
      const choice: VideoChoice = {
        format: pending.format,
        fps: pending.fps,
        resolution: pending.resolution,
        background: pending.background,
        quality: pending.quality,
      }
      set({ phase: { kind: 'done', result, choice } })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
      // ปุ่มคือ "ดาวน์โหลด" เสร็จแล้วดาวน์โหลดให้เลย (ไม่ทำตอนกลับมาถามต่อหลังรีเฟรช)
      const url = videoUrlFor(result, choice)
      if (!resume && url) download(url)
    } catch (error) {
      // สั่งหยุดเอง หรือกลับมาแล้วงานหายไป (เซิร์ฟเวอร์เริ่มใหม่) ไม่ใช่ความผิดพลาด กลับไปแก้โค้ดต่อ
      if (error instanceof ApiError && error.code === CANCELLED_CODE) {
        set({ phase: { kind: 'idle' } })
      } else if (resume && error instanceof ApiError && error.status === 404 && !seen) {
        set({ phase: { kind: 'idle' } })
      } else {
        set({ phase: { kind: 'failed', message: error instanceof Error ? error.message : i18n.t('animation.render.failed') } })
      }
    } finally {
      write(PENDING_KEY, null)
      currentJob = null
      set({ cancelling: false })
    }
  }

  return {
    html: read(DRAFT_KEY) ?? '',
    filename: '',
    seconds: ANIMATION_DEFAULT_SECONDS,
    phase: { kind: 'idle' },
    cancelling: false,

    cancel: () => {
      if (!busy() || !currentJob || get().cancelling) return
      set({ cancelling: true })
      // สำเร็จแล้ว wait เห็นสถานะ cancelled เองในการถามรอบถัดไป ไม่สำเร็จ (งานเพิ่งจบพอดี) ก็ปล่อยให้จบตามปกติ
      cancelAnimationJob(currentJob).catch(() => set({ cancelling: false }))
    },

    setHtml: (html) => {
      // แก้โค้ดหลัง render เสร็จหรือพัง กลับไปโชว์ตัวอย่างสดของโค้ดใหม่ (วิดีโอเดิมยังเปิดได้จากประวัติ)
      set(busy() ? { html } : { html, phase: { kind: 'idle' } })
      write(DRAFT_KEY, html || null)
    },

    setFilename: (filename) => set({ filename }),
    setSeconds: (seconds) => set({ seconds }),

    render: ({ format, fps, resolution, background, quality }) => {
      const { html, filename, seconds } = get()
      if (busy() || !html.trim()) return
      if (new Blob([html]).size > ANIMATION_MAX_CODE_KB * 1024) {
        set({ phase: { kind: 'failed', message: i18n.t('animation.render.tooLarge', { size: ANIMATION_MAX_CODE_KB }) } })
        return
      }
      const pending = { requestId: crypto.randomUUID(), html, filename: filename.trim() || 'code.html', format, fps, seconds, resolution, background, quality }
      write(PENDING_KEY, JSON.stringify(pending))
      void wait(pending, false)
    },

    resume: () => {
      const raw = read(PENDING_KEY)
      if (!raw || busy()) return
      try {
        // รุ่นก่อนไม่มี format หรือ fps ตอนนั้นมีแต่ MP4 60 fps
        void wait({ format: 'mp4', fps: 60, seconds: 10, ...(JSON.parse(raw) as Partial<Pending>) } as Pending, true)
      } catch {
        write(PENDING_KEY, null)
      }
    },

    reset: () => {
      if (!busy()) set({ phase: { kind: 'idle' } })
    },
  }
})

// ลิงก์ดาวน์โหลดเป็นแบบ attachment เบราว์เซอร์ดาวน์โหลดเลยไม่เปลี่ยนหน้า
function download(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

// localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์) แค่จำข้ามการรีเฟรชไม่ได้ ไม่ให้ทั้งหน้าพัง
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // ดูหมายเหตุใน read
  }
}
