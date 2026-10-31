import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ApiError, cancelAnimationJob, CANCELLED_CODE, renderAnimationVideo } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/query'
import { effectiveOptions, videoUrlFor, type VideoChoice } from '@/lib/videoFormats'
import { useAnimationStore } from '@/store/animation'
import { useUsageStore } from '@/store/usage'
import type { AnimationJob, AnimationResult } from '@/types/animation'

/*
  render วิดีโอทีละคลิปทีละแบบ (ชนิดไฟล์ × fps × ความยาว) ตอนกดดาวน์โหลด (คลิปที่สร้างแล้วมีแค่โค้ด ดูตัวอย่างได้ทันทีโดยไม่ต้อง render)

  อยู่นอกหน้า ไปหน้าอื่นแล้วกลับมายังเห็นความคืบหน้า กด render หลายคลิปหลายแบบได้ เซิร์ฟเวอร์ทำทีละงานตามคิว
  งานที่ render อยู่จำไว้ใน localStorage รีเฟรชแล้วถามสถานะต่อ
  เสร็จแล้วดาวน์โหลดให้เองทันที (ถ้ากดในรอบนี้) และอัปเดตทุกที่ที่แสดงคลิปนั้น
*/

export type VideoState =
  | { kind: 'rendering'; job?: AnimationJob; cancelling?: boolean }
  | { kind: 'failed'; message: string }

/** งานที่ render อยู่ jobId ได้จากเซิร์ฟเวอร์ตอนรับงาน ไว้ถามสถานะต่อหลังรีเฟรช */
type Pending = { id: string; choice: VideoChoice; jobId?: string }

const PENDING_KEY = 'animation.video.pending'

// choice ที่ส่งมาที่นี่มี seconds ของคลิปแล้วเสมอ (VideoDownloadButton ใช้ lengthFor) ยกเว้นงานค้างจากรุ่นก่อน
const stateKey = (id: string, choice: VideoChoice) => {
  const { resolution, background, quality } = effectiveOptions(choice)
  return `${id}:${choice.format}:${choice.fps}:${choice.seconds ?? ''}:${resolution}:${background}:${quality}`
}

type VideoStore = {
  /** สถานะของงานที่กำลัง render หรือ render ไม่สำเร็จ ตาม stateKey */
  states: Record<string, VideoState>
  /** คลิปที่ render เสร็จในรอบนี้ มีลิงก์ดาวน์โหลดที่ข้อมูลเก่ายังไม่มี ตาม id ของคลิป */
  ready: Record<string, AnimationResult>
  render: (id: string, choice: VideoChoice) => void
  /** สั่งหยุด render แบบนี้ของคลิปนี้ หยุดแล้วปุ่มกลับเป็นดาวน์โหลดเหมือนยังไม่ได้กด */
  cancel: (id: string, choice: VideoChoice) => void
  resume: () => void
}

export const useVideoStore = create<VideoStore>()((set, get) => {
  // id ของงาน render ที่รอผลอยู่ ตาม stateKey ไว้สั่งหยุด
  const jobs = new Map<string, string>()
  const setState = (key: string, state: VideoState | null) =>
    set(({ states }) => {
      const next = { ...states }
      if (state) next[key] = state
      else delete next[key]
      return { states: next }
    })

  async function wait(pending: Pending, resume: boolean) {
    const key = stateKey(pending.id, pending.choice)
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
          jobs.set(key, job.id)
          const current = get().states[key]
          setState(key, { kind: 'rendering', job, cancelling: current?.kind === 'rendering' && current.cancelling })
        },
        resume,
      )
      setState(key, null)
      set(({ ready }) => ({ ready: { ...ready, [result.id]: result } }))
      useAnimationStore.getState().replaceResult(result)
      void queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
      // ตัดเครดิตไปแล้วบนเซิร์ฟเวอร์ อ่านยอดใหม่
      void useUsageStore.getState().refresh()
      const url = videoUrlFor(result, pending.choice)
      if (!resume && url) download(url)
    } catch (error) {
      // สั่งหยุดเอง หรือกลับมาแล้วงานหายไป (เซิร์ฟเวอร์เริ่มใหม่) ไม่ต้องขึ้นว่าพัง กดใหม่ได้
      if (error instanceof ApiError && error.code === CANCELLED_CODE) setState(key, null)
      else if (resume && error instanceof ApiError && error.status === 404) setState(key, null)
      else setState(key, { kind: 'failed', message: error instanceof Error ? error.message : i18n.t('animation.video.failed') })
    } finally {
      forget(key)
      jobs.delete(key)
    }
  }

  return {
    states: {},
    ready: {},
    cancel: (id, choice) => {
      const key = stateKey(id, choice)
      const state = get().states[key]
      const jobId = jobs.get(key)
      if (state?.kind !== 'rendering' || state.cancelling || !jobId) return
      setState(key, { ...state, cancelling: true })
      cancelAnimationJob(jobId).catch(() => {
        const latest = get().states[key]
        if (latest?.kind === 'rendering') setState(key, { ...latest, cancelling: false })
      })
    },

    render: (id, choice) => {
      if (get().states[stateKey(id, choice)]?.kind === 'rendering') return
      void wait({ id, choice }, false)
    },
    resume: () => {
      for (const pending of readPending()) {
        // ไม่มี jobId = ปิดหน้าก่อนเซิร์ฟเวอร์ตอบรับงาน ไม่รู้ว่ารับหรือยัง ส่งใหม่ปลอดภัย (ได้งานเดิมถ้ารับแล้ว)
        if (!get().states[stateKey(pending.id, pending.choice)]) void wait(pending, Boolean(pending.jobId))
      }
    },
  }
})

/**
 * ข้อมูลล่าสุดของคลิป (รวมลิงก์ดาวน์โหลดที่ render เสร็จในรอบนี้) กับสถานะการ render แบบที่เลือก
 */
export function useClipVideo(item: AnimationResult, choice?: VideoChoice): { item: AnimationResult; state?: VideoState } {
  const ready = useVideoStore((store) => store.ready[item.id])
  const state = useVideoStore((store) => (choice ? store.states[stateKey(item.id, choice)] : undefined))
  if (!ready) return { item, state }
  return {
    item: {
      ...item,
      videoUrl: item.videoUrl ?? ready.videoUrl,
      videoDownloadUrl: item.videoDownloadUrl ?? ready.videoDownloadUrl,
      // ผลที่เพิ่ง render มีครบทุกไฟล์ของคลิปแล้ว (เซิร์ฟเวอร์อ่านใหม่หลังบันทึก) ใช้แทนรายการเก่าได้เลย
      videos: (ready.videos?.length ?? 0) >= (item.videos?.length ?? 0) ? ready.videos : item.videos,
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
  const key = stateKey(pending.id, pending.choice)
  writePending([...readPending().filter((other) => stateKey(other.id, other.choice) !== key), pending])
}

function forget(key: string) {
  writePending(readPending().filter((other) => stateKey(other.id, other.choice) !== key))
}

// localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์) แค่จำข้ามการรีเฟรชไม่ได้ ไม่ให้ทั้งหน้าพัง
function readPending(): Pending[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : []
    // รุ่นก่อนเก็บเป็น id ของคลิปเฉย ๆ ตอนนั้นมีแต่ MP4 60 fps และ id ของงานคือ id ของคลิป
    // รุ่นถัดมามี format แต่ยังไม่มี fps (ตอนนั้น render ที่ 60 fps เสมอ)
    return parsed.flatMap((entry): Pending[] => {
      if (typeof entry === 'string') return [{ id: entry, choice: { format: 'mp4', fps: 60 }, jobId: entry }]
      const old = entry as Partial<Pending> & { format?: VideoChoice['format'] }
      if (!old.id) return []
      return [{ id: old.id, choice: old.choice ?? { format: old.format ?? 'mp4', fps: 60 }, jobId: old.jobId }]
    })
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
