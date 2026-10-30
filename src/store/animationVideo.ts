import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ApiError, renderAnimationVideo } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/query'
import type { VideoFormat } from '@/lib/videoFormats'
import { useAnimationStore } from '@/store/animation'
import type { AnimationJob, AnimationResult } from '@/types/animation'

/*
  render วิดีโอทีละคลิปทีละแบบตอนกดดาวน์โหลด (คลิปที่สร้างแล้วมีแค่โค้ด ดูตัวอย่างได้ทันทีโดยไม่ต้อง render)

  อยู่นอกหน้า ไปหน้าอื่นแล้วกลับมายังเห็นความคืบหน้า กด render หลายคลิปหลายแบบได้ เซิร์ฟเวอร์ทำทีละงานตามคิว
  งานที่ render อยู่จำไว้ใน localStorage รีเฟรชแล้วถามสถานะต่อ
  เสร็จแล้วดาวน์โหลดให้เองทันที (ถ้ากดในรอบนี้) และอัปเดตทุกที่ที่แสดงคลิปนั้น
*/

export type VideoState = { kind: 'rendering'; job?: AnimationJob } | { kind: 'failed'; message: string }

/** งานที่ render อยู่ jobId ได้จากเซิร์ฟเวอร์ตอนรับงาน ไว้ถามสถานะต่อหลังรีเฟรช */
type Pending = { id: string; format: VideoFormat; jobId?: string }

const PENDING_KEY = 'animation.video.pending'

const stateKey = (id: string, format: VideoFormat) => `${id}:${format}`

type VideoStore = {
  /** สถานะของงานที่กำลัง render หรือ render ไม่สำเร็จ ตาม stateKey */
  states: Record<string, VideoState>
  /** คลิปที่ render เสร็จในรอบนี้ มีลิงก์ดาวน์โหลดที่ข้อมูลเก่ายังไม่มี ตาม id ของคลิป */
  ready: Record<string, AnimationResult>
  render: (id: string, format: VideoFormat) => void
  resume: () => void
}

export const useVideoStore = create<VideoStore>()((set, get) => {
  const setState = (key: string, state: VideoState | null) =>
    set(({ states }) => {
      const next = { ...states }
      if (state) next[key] = state
      else delete next[key]
      return { states: next }
    })

  async function wait(pending: Pending, resume: boolean) {
    const key = stateKey(pending.id, pending.format)
    setState(key, { kind: 'rendering' })
    remember(pending)
    try {
      const result = await renderAnimationVideo(
        pending,
        (job) => {
          if (!pending.jobId) {
            pending = { ...pending, jobId: job.id }
            remember(pending)
          }
          setState(key, { kind: 'rendering', job })
        },
        resume,
      )
      setState(key, null)
      set(({ ready }) => ({ ready: { ...ready, [result.id]: result } }))
      useAnimationStore.getState().replaceResult(result)
      void queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
      const url = result.downloads?.[pending.format]
      if (!resume && url) download(url)
    } catch (error) {
      // กลับมาแล้วงานหายไป (เซิร์ฟเวอร์เริ่มใหม่) ไม่ต้องขึ้นว่าพัง กดใหม่ได้
      if (resume && error instanceof ApiError && error.status === 404) setState(key, null)
      else setState(key, { kind: 'failed', message: error instanceof Error ? error.message : i18n.t('animation.video.failed') })
    } finally {
      forget(key)
    }
  }

  return {
    states: {},
    ready: {},
    render: (id, format) => {
      if (get().states[stateKey(id, format)]?.kind === 'rendering') return
      void wait({ id, format }, false)
    },
    resume: () => {
      for (const pending of readPending()) {
        // ไม่มี jobId = ปิดหน้าก่อนเซิร์ฟเวอร์ตอบรับงาน ไม่รู้ว่ารับหรือยัง ส่งใหม่ปลอดภัย (ได้งานเดิมถ้ารับแล้ว)
        if (!get().states[stateKey(pending.id, pending.format)]) void wait(pending, Boolean(pending.jobId))
      }
    },
  }
})

/**
 * ข้อมูลล่าสุดของคลิป (รวมลิงก์ดาวน์โหลดที่ render เสร็จในรอบนี้) กับสถานะการ render แบบ format
 */
export function useClipVideo(item: AnimationResult, format: VideoFormat = 'mp4'): { item: AnimationResult; state?: VideoState } {
  const ready = useVideoStore((store) => store.ready[item.id])
  const state = useVideoStore((store) => store.states[stateKey(item.id, format)])
  if (!ready) return { item, state }
  return {
    item: {
      ...item,
      videoUrl: item.videoUrl ?? ready.videoUrl,
      videoDownloadUrl: item.videoDownloadUrl ?? ready.videoDownloadUrl,
      downloads: { ...ready.downloads, ...item.downloads },
    },
    state,
  }
}

// ลิงก์ดาวน์โหลดเป็นแบบ attachment เบราว์เซอร์ดาวน์โหลดเลยไม่เปลี่ยนหน้า
function download(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
}

function remember(pending: Pending) {
  const key = stateKey(pending.id, pending.format)
  writePending([...readPending().filter((other) => stateKey(other.id, other.format) !== key), pending])
}

function forget(key: string) {
  writePending(readPending().filter((other) => stateKey(other.id, other.format) !== key))
}

// localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์) แค่จำข้ามการรีเฟรชไม่ได้ ไม่ให้ทั้งหน้าพัง
function readPending(): Pending[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : []
    // รุ่นก่อนเก็บเป็น id ของคลิปเฉย ๆ ตอนนั้นมีแต่ MP4 และ id ของงานคือ id ของคลิป
    return parsed.map((entry) =>
      typeof entry === 'string' ? { id: entry, format: 'mp4', jobId: entry } : (entry as Pending),
    )
  } catch {
    return []
  }
}

function writePending(pending: Pending[]) {
  try {
    if (pending.length) localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // ดูหมายเหตุใน readPending
  }
}
