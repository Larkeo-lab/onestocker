import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ANIMATION_MAX_CODE_KB, ApiError, renderAnimationCode } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/query'
import type { AnimationJob, AnimationResult } from '@/types/animation'

/*
  แท็บ "render โค้ด" ในหน้าแอนิเมชัน: วางโค้ด HTML เองแล้ว render เป็น MP4 ไม่ผ่าน AI

  อยู่นอกหน้าแบบเดียวกับ store/animation ไปหน้าอื่นแล้วกลับมาโค้ดกับงานยังอยู่
  โค้ดที่พิมพ์ค้างไว้จำใน localStorage (ปิดแท็บแล้วไม่หาย) งานที่ส่งแล้วจำ id ไว้ถามต่อหลังรีเฟรช
*/

export type RenderPhase =
  | { kind: 'idle' }
  | { kind: 'working'; job?: AnimationJob }
  | { kind: 'done'; result: AnimationResult }
  | { kind: 'failed'; message: string }

type Pending = { requestId: string; html: string; filename: string }

const DRAFT_KEY = 'animation.render.draft'
const PENDING_KEY = 'animation.render.pending'

type RenderState = {
  html: string
  filename: string
  phase: RenderPhase
  setHtml: (html: string) => void
  setFilename: (filename: string) => void
  render: () => void
  resume: () => void
  /** กลับไปแก้โค้ดต่อ (โค้ดเดิมยังอยู่) */
  reset: () => void
}

export const useRenderStore = create<RenderState>()((set, get) => {
  const busy = () => get().phase.kind === 'working'

  async function wait(pending: Pending, resume: boolean) {
    set({ phase: { kind: 'working' } })
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
      set({ phase: { kind: 'done', result: batch.items[0] } })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
    } catch (error) {
      if (resume && error instanceof ApiError && error.status === 404 && !seen) {
        set({ phase: { kind: 'idle' } })
      } else {
        set({ phase: { kind: 'failed', message: error instanceof Error ? error.message : i18n.t('animation.render.failed') } })
      }
    } finally {
      write(PENDING_KEY, null)
    }
  }

  return {
    html: read(DRAFT_KEY) ?? '',
    filename: '',
    phase: { kind: 'idle' },

    setHtml: (html) => {
      // แก้โค้ดหลัง render เสร็จหรือพัง กลับไปโชว์ตัวอย่างสดของโค้ดใหม่ (วิดีโอเดิมยังเปิดได้จากประวัติ)
      set(busy() ? { html } : { html, phase: { kind: 'idle' } })
      write(DRAFT_KEY, html || null)
    },

    setFilename: (filename) => set({ filename }),

    render: () => {
      const { html, filename } = get()
      if (busy() || !html.trim()) return
      if (new Blob([html]).size > ANIMATION_MAX_CODE_KB * 1024) {
        set({ phase: { kind: 'failed', message: i18n.t('animation.render.tooLarge', { size: ANIMATION_MAX_CODE_KB }) } })
        return
      }
      const pending = { requestId: crypto.randomUUID(), html, filename: filename.trim() || 'code.html' }
      write(PENDING_KEY, JSON.stringify(pending))
      void wait(pending, false)
    },

    resume: () => {
      const raw = read(PENDING_KEY)
      if (!raw || busy()) return
      try {
        void wait(JSON.parse(raw) as Pending, true)
      } catch {
        write(PENDING_KEY, null)
      }
    },

    reset: () => {
      if (!busy()) set({ phase: { kind: 'idle' } })
    },
  }
})

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
