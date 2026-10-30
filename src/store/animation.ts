import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ANIMATION_ACCEPT, ANIMATION_MAX_MB, ApiError, cancelAnimationJob, CANCELLED_CODE, makeAnimation, requestAnimationUpload, uploadToR2 } from '@/lib/api'
import { queryClient, queryKeys } from '@/lib/query'
import type { AnimationJob, AnimationResult } from '@/types/animation'

/*
  งานสร้างแอนิเมชันของหน้าแอนิเมชัน อยู่นอกหน้า ไปหน้าอื่นแล้วกลับมายังเห็นงานเดิม และงานยังรอผลต่อ

  เลือกวิดีโอแล้วอัปขึ้น R2 ทันที (uploading → ready) แต่ยังไม่สร้าง ผู้ใช้ดูวิดีโอที่เลือกแล้วกด generate เอง
  ระหว่างนั้นเปลี่ยนวิดีโอได้ ไฟล์ที่อัปแล้วแต่ไม่ได้กดสร้างค้างอยู่ใน animation-uploads/ (ต้องตั้ง lifecycle บน R2 ให้ลบ)

  งานที่เซิร์ฟเวอร์รับแล้วจำ id ไว้ใน localStorage รีเฟรชหรือปิดแท็บแล้วเปิดใหม่ก็ถามสถานะต่อได้
  (เซิร์ฟเวอร์จำงานที่กำลังทำ งานที่เสร็จแล้วอยู่ในประวัติ) ระหว่างอัปโหลดจำไม่ได้ เพราะไฟล์อยู่ในเครื่อง
*/

export type AnimationPhase =
  | { kind: 'idle' }
  | { kind: 'uploading'; percent: number; video: SelectedVideo }
  | { kind: 'ready'; video: SelectedVideo; uploadKey: string }
  | { kind: 'working'; job?: AnimationJob }
  /** คลิปที่ได้ เรียงตามลำดับ อย่างน้อยหนึ่งคลิป */
  | { kind: 'done'; results: AnimationResult[] }
  | { kind: 'failed'; message: string; job?: AnimationJob }

/** วิดีโอที่เลือก previewUrl เป็น object URL ของไฟล์ในเครื่อง ใช้เล่นให้ดูก่อนกด generate */
export type SelectedVideo = { filename: string; sizeBytes: number; previewUrl: string; isImage: boolean }

// ไม่ส่งความยาว AI เขียนลูป 10 วินาทีเสมอ ความยาวไฟล์เลือกตอนดาวน์โหลด (ทีละ 10 วินาที ลูปจึงต่อกันสนิท)
type Pending = { requestId: string; uploadKey: string; filename: string; count: number }

const PENDING_KEY = 'animation.pending'

type AnimationState = {
  phase: AnimationPhase
  /**
   * มีไฟล์ตัวอย่างล่าสุดอยู่ในเบราว์เซอร์ สร้างใหม่จากไฟล์เดิมได้ (regenerate)
   * เซิร์ฟเวอร์ลบไฟล์ตัวอย่างทันทีที่ AI ดูเสร็จ จึงต้องอัปใหม่จากไฟล์ที่จำไว้ รีเฟรชหน้าแล้วไฟล์หาย
   */
  canRegenerate: boolean
  /** เลือกวิดีโอแล้วอัปขึ้นทันที เลือกใหม่ระหว่างอัปหรือหลังอัปเสร็จได้ */
  select: (file: File) => void
  /** อัปไฟล์ตัวอย่างล่าสุดใหม่แล้วสร้างทันทีด้วยจำนวนคลิปเท่าครั้งก่อน */
  regenerate: () => void
  /** สั่งหยุดงานที่กำลังสร้าง เซิร์ฟเวอร์ยืนยันแล้วกลับไปหน้าเริ่ม (คลิปที่เสร็จก่อนหยุดอยู่ในประวัติ) */
  cancel: () => void
  /** กำลังรอเซิร์ฟเวอร์หยุดงาน */
  cancelling: boolean
  /** สร้าง count คลิปจากวิดีโอที่อัปเสร็จแล้ว (ready) */
  generate: (count: number) => void
  /** คลิปที่เพิ่ง render MP4 เสร็จ แทนตัวเดิมในผลลัพธ์ที่แสดงอยู่ (ดู store/animationVideo) */
  replaceResult: (result: AnimationResult) => void
  /** งานที่ส่งไปก่อนรีเฟรชหน้า ถามสถานะต่อ เรียกซ้ำได้ ไม่มีงานค้างก็ไม่ทำอะไร */
  resume: () => void
  reset: () => void
}

export const useAnimationStore = create<AnimationState>()((set, get) => {
  const busy = () => get().phase.kind === 'working'
  // อัปไฟล์ก่อนหน้ายังไม่เสร็จแล้วเลือกไฟล์ใหม่ ผลของไฟล์เก่าต้องไม่ทับ
  let selection = 0
  // ไฟล์ตัวอย่างล่าสุดกับจำนวนคลิปที่ขอครั้งล่าสุด ไว้สร้างใหม่ (regenerate)
  let lastFile: File | null = null
  let lastCount = 1
  // อัปเสร็จแล้วสร้างต่อเลย (regenerate) ไม่ต้องรอกด
  let generateAfterUpload: number | null = null
  // id ของงานที่รอผลอยู่ ไว้สั่งหยุด
  let currentJob: string | null = null
  let previewUrl: string | null = null
  const releasePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = null
  }
  const fail = (message: string, job?: AnimationJob) => {
    releasePreview()
    set({ phase: { kind: 'failed', message, job } })
  }

  async function wait(pending: Pending, resume: boolean) {
    set({ phase: { kind: 'working' }, cancelling: false })
    currentJob = pending.requestId
    let lastJob: AnimationJob | undefined
    try {
      const batch = await makeAnimation(
        pending,
        (job) => {
          // เซิร์ฟเวอร์ให้งานเดิมที่ยังทำอยู่แทนงานที่ส่ง ติดตามงานนั้นต่อ (จำ id ใหม่ไว้ถามต่อหลังรีเฟรช)
          if (job.id !== pending.requestId) {
            pending = { ...pending, requestId: job.id }
            currentJob = job.id
            writePending(pending)
          }
          lastJob = job
          set({ phase: { kind: 'working', job } })
        },
        resume,
      )
      set({ phase: { kind: 'done', results: batch.items } })
      void queryClient.invalidateQueries({ queryKey: queryKeys.animation.all })
    } catch (error) {
      if (error instanceof ApiError && error.code === CANCELLED_CODE) {
        // สั่งหยุดเอง ไม่ใช่ความผิดพลาด กลับไปหน้าเริ่ม (สร้างใหม่จากไฟล์เดิมได้ถ้ายังจำไฟล์ไว้)
        set({ phase: { kind: 'idle' } })
      } else if (resume && error instanceof ApiError && error.status === 404 && !lastJob) {
        // งานที่จำไว้หายไปแล้ว (เซิร์ฟเวอร์เริ่มใหม่ระหว่างปิดหน้า) กลับไปหน้าอัปเฉย ๆ
        set({ phase: { kind: 'idle' } })
      } else {
        fail(error instanceof Error ? error.message : i18n.t('animation.failed'), lastJob)
      }
    } finally {
      writePending(null)
      currentJob = null
      set({ cancelling: false })
    }
  }

  return {
    phase: { kind: 'idle' },
    canRegenerate: false,
    cancelling: false,

    cancel: () => {
      if (!busy() || !currentJob || get().cancelling) return
      set({ cancelling: true })
      // สำเร็จแล้ว wait เห็นสถานะ cancelled เองในการถามรอบถัดไป ไม่สำเร็จ (งานเพิ่งจบพอดี) ก็ปล่อยให้จบตามปกติ
      cancelAnimationJob(currentJob).catch(() => set({ cancelling: false }))
    },

    select: (file) => {
      if (busy()) return
      if (!ANIMATION_ACCEPT.split(',').includes(file.type)) return fail(i18n.t('animation.wrongType'))
      if (file.size > ANIMATION_MAX_MB * 1024 * 1024) {
        return fail(i18n.t('animation.tooLarge', { size: ANIMATION_MAX_MB }))
      }
      releasePreview()
      lastFile = file
      set({ canRegenerate: true })
      previewUrl = URL.createObjectURL(file)
      const video: SelectedVideo = {
        filename: file.name,
        sizeBytes: file.size,
        previewUrl,
        isImage: file.type.startsWith('image/'),
      }
      const mine = ++selection
      set({ phase: { kind: 'uploading', percent: 0, video } })
      void (async () => {
        try {
          const upload = await requestAnimationUpload(file)
          await uploadToR2(upload.url, file, (percent) => {
            if (mine === selection) set({ phase: { kind: 'uploading', percent, video } })
          })
          if (mine !== selection) return
          set({ phase: { kind: 'ready', video, uploadKey: upload.key } })
          if (generateAfterUpload !== null) {
            const count = generateAfterUpload
            generateAfterUpload = null
            get().generate(count)
          }
        } catch (error) {
          if (mine !== selection) return
          generateAfterUpload = null
          fail(error instanceof Error ? error.message : i18n.t('animation.failed'))
        }
      })()
    },

    regenerate: () => {
      if (!lastFile || busy()) return
      generateAfterUpload = lastCount
      get().select(lastFile)
    },

    generate: (count) => {
      const phase = get().phase
      if (phase.kind !== 'ready') return
      lastCount = count
      const pending = { requestId: crypto.randomUUID(), uploadKey: phase.uploadKey, filename: phase.video.filename, count }
      releasePreview()
      writePending(pending)
      void wait(pending, false)
    },

    replaceResult: (result) => {
      const phase = get().phase
      if (phase.kind !== 'done') return
      set({ phase: { ...phase, results: phase.results.map((item) => (item.id === result.id ? { ...item, ...result } : item)) } })
    },

    resume: () => {
      const pending = readPending()
      if (pending && !busy()) void wait(pending, true)
    },

    reset: () => {
      if (busy()) return
      selection++
      generateAfterUpload = null
      releasePreview()
      set({ phase: { kind: 'idle' } })
    },
  }
})

// localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์) แค่จำงานข้ามการรีเฟรชไม่ได้ ไม่ให้ทั้งหน้าพัง
function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as Partial<Pending>
    // หน้าเว็บรุ่นก่อนมีจำนวนคลิปไม่ได้จำ count ไว้ ตอนนั้นทำทีละคลิปเสมอ
    return { ...pending, count: pending.count ?? 1 } as Pending
  } catch {
    return null
  }
}

function writePending(pending: Pending | null) {
  try {
    if (pending) localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // ดูหมายเหตุใน readPending
  }
}
