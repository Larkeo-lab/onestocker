import { create } from 'zustand'

import i18n from '@/config/i18n'
import {
  ApiError,
  removeBackground,
  requestRemoveBgUpload,
  uploadToR2,
} from '@/lib/api'
import { cachedCreditCost } from '@/lib/creditCosts'
import { errorMessage } from '@/lib/error'
import { queryClient, queryKeys } from '@/lib/query'
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_MB,
  REMOVE_BG_CONCURRENCY,
  REMOVE_BG_UPLOAD_CONCURRENCY,
} from '@/lib/removeBg'
import { useUsageStore } from '@/store/usage'
import { QUALITY_FEATURE, type BackgroundRemoval, type RemoveBgFormat, type RemoveBgQuality } from '@/types/removeBg'

/*
  ขั้นตอนของรูปหนึ่งใบ ทำสองจังหวะตามที่ผู้ใช้กด

    วางรูป → waitingUpload → uploading → ready          (อัปขึ้น R2 ทันที ยังไม่ใช้เครดิต)
    กดลบพื้นหลัง → queued → processing → done | error    (ตัดเครดิตตอนนี้)

  กดลบพื้นหลังระหว่างที่บางรูปยังอัปไม่เสร็จได้ รูปพวกนั้นจะมี format ติดไว้แล้ว
  อัปเสร็จเมื่อไรจะเข้าคิวลบพื้นหลังต่อเอง ไม่ต้องกดซ้ำ
*/
export type RemoveBgJobStatus =
  | 'waitingUpload'
  | 'uploading'
  | 'ready'
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'

export type RemoveBgJob = {
  id: string
  file: File
  /** object URL ของต้นฉบับ ไว้แสดงระหว่างรอผลลัพธ์ */
  sourceUrl: string
  /** null = ยังไม่ได้กดลบพื้นหลัง ได้ค่าตอนกดตามตัวเลือกบนหน้าในตอนนั้น */
  format: RemoveBgFormat | null
  /** ได้ค่าพร้อม format ตอนกดลบพื้นหลัง */
  quality: RemoveBgQuality | null
  status: RemoveBgJobStatus
  /** 0–100 ระหว่างอัปโหลด */
  progress: number
  /**
   * key ของต้นฉบับบน R2 ที่อัปเสร็จแล้วแต่ยังไม่ได้ผลลัพธ์
   * ลองใหม่ด้วย key เดิมได้โดยไม่ต้องอัปไฟล์ใหญ่ซ้ำ null = ต้องอัปใหม่
   */
  key: string | null
  result: BackgroundRemoval | null
  error: string | null
}

type RemoveBgState = {
  jobs: RemoveBgJob[]
  /** เพิ่มรูปแล้วเริ่มอัปทันที คืนข้อความของไฟล์ที่ถูกข้าม (ชนิดไม่รองรับ ใหญ่เกิน) */
  addFiles: (files: File[]) => string[]
  /** ลบพื้นหลังทุกรูปที่ยังไม่ได้สั่ง ด้วยรูปแบบและระดับคุณภาพที่เลือก */
  start: (format: RemoveBgFormat, quality: RemoveBgQuality) => void
  retry: (id: string) => void
  dismiss: (id: string) => void
  clearDone: () => void
}

/** รูปที่ยังไม่ได้กดลบพื้นหลัง (อัปเสร็จแล้วหรือกำลังอัป) กดปุ่มแล้วจะถูกสั่งรวมไปด้วย */
export function isAwaitingStart(job: RemoveBgJob): boolean {
  return job.format === null && (job.status === 'waitingUpload' || job.status === 'uploading' || job.status === 'ready')
}

/** รูปที่อัปยังไม่เสร็จ ปิดแท็บตอนนี้ไฟล์จะหาย */
export function isUploadPending(job: RemoveBgJob): boolean {
  return job.status === 'waitingUpload' || job.status === 'uploading'
}

/*
  งานอยู่ใน store ระดับแอป ไม่ใช่ state ของหน้า
  ผู้ใช้กดไปหน้าอื่นระหว่างอัปโหลด งานยังเดินต่อ กลับมาก็ยังเห็นรายการเดิม
*/
export const useRemoveBgStore = create<RemoveBgState>((set, get) => {
  let uploading = 0
  let processing = 0

  function update(id: string, patch: Partial<RemoveBgJob>) {
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    }))
  }

  function find(id: string) {
    return get().jobs.find((job) => job.id === id)
  }

  /*
    คิวอัปกับคิวลบพื้นหลังแยกกัน รูปที่อัปเสร็จแล้วไม่ต้องรอไฟล์ใหญ่ใบอื่นอัปให้เสร็จก่อน
    ทั้งสองคิวเปลี่ยนสถานะก่อนเริ่มงาน รอบถัดของลูปจะได้ไม่หยิบรูปเดิมซ้ำ
  */
  function pump() {
    while (uploading < REMOVE_BG_UPLOAD_CONCURRENCY) {
      const next = get().jobs.find((job) => job.status === 'waitingUpload')
      if (!next) break
      uploading += 1
      update(next.id, { status: 'uploading', progress: 0, error: null })
      void upload(next.id).finally(() => {
        uploading -= 1
        pump()
      })
    }

    while (processing < REMOVE_BG_CONCURRENCY) {
      const next = get().jobs.find((job) => job.status === 'queued')
      if (!next) break
      processing += 1
      update(next.id, { status: 'processing', error: null })
      void process(next.id).finally(() => {
        processing -= 1
        pump()
      })
    }
  }

  async function upload(id: string) {
    const job = find(id)
    if (!job) return
    try {
      const link = await requestRemoveBgUpload(job.file)
      await uploadToR2(link.url, job.file, (progress) => update(id, { progress }))
      // อ่านใหม่ ผู้ใช้อาจกดลบพื้นหลังระหว่างที่กำลังอัป
      const current = find(id)
      update(id, { key: link.key, status: current?.format ? 'queued' : 'ready' })
    } catch (error) {
      update(id, { status: 'error', error: errorMessage(error), key: null })
    }
  }

  async function process(id: string) {
    const job = find(id)
    if (!job?.key || !job.format || !job.quality) return
    try {
      const result = await removeBackground({
        key: job.key,
        filename: job.file.name,
        format: job.format,
        quality: job.quality,
      })
      update(id, { status: 'done', result, key: null })

      useUsageStore.getState().markUsed(cachedCreditCost(QUALITY_FEATURE[job.quality]))
      void queryClient.invalidateQueries({ queryKey: queryKeys.removeBg.all })
    } catch (error) {
      update(id, { status: 'error', ...processFailure(error, job.key) })
    }
  }

  return {
    jobs: [],

    addFiles: (files) => {
      const skipped: string[] = []
      const added: RemoveBgJob[] = []

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          skipped.push(i18n.t('removeBg.invalidType', { name: file.name }))
          continue
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          skipped.push(i18n.t('removeBg.tooLarge', { name: file.name, size: MAX_UPLOAD_MB }))
          continue
        }
        added.push({
          id: crypto.randomUUID(),
          file,
          sourceUrl: URL.createObjectURL(file),
          format: null,
          quality: null,
          status: 'waitingUpload',
          progress: 0,
          key: null,
          result: null,
          error: null,
        })
      }

      if (added.length > 0) {
        // ต่อท้ายตามลำดับที่เลือก การ์ดจะได้เรียงตรงกับไฟล์ที่เลือกมา
        set((state) => ({ jobs: [...state.jobs, ...added] }))
        pump()
      }
      return skipped
    },

    start: (format, quality) => {
      set((state) => ({
        jobs: state.jobs.map((job) =>
          isAwaitingStart(job)
            ? { ...job, format, quality, status: job.status === 'ready' ? 'queued' : job.status }
            : job,
        ),
      }))
      pump()
    },

    retry: (id) => {
      const job = find(id)
      if (!job || job.status !== 'error') return
      /*
        มีต้นฉบับอยู่แล้ว ลบพื้นหลังซ้ำได้เลย
        ไม่มี ต้องอัปใหม่ ถ้าเคยกดลบพื้นหลังไว้แล้ว อัปเสร็จจะเข้าคิวต่อเอง
      */
      update(id, { status: job.key && job.format && job.quality ? 'queued' : 'waitingUpload', error: null })
      pump()
    },

    dismiss: (id) => {
      const job = find(id)
      // กำลังทำอยู่เอาออกไม่ได้ งานจะยังเดินต่อแล้วหาแถวไม่เจอ
      if (!job || job.status === 'uploading' || job.status === 'processing') return
      URL.revokeObjectURL(job.sourceUrl)
      set((state) => ({ jobs: state.jobs.filter((item) => item.id !== id) }))
    },

    clearDone: () => {
      const done = get().jobs.filter((job) => job.status === 'done')
      for (const job of done) URL.revokeObjectURL(job.sourceUrl)
      set((state) => ({ jobs: state.jobs.filter((job) => job.status !== 'done') }))
    },
  }
})

/**
 * แปลงความล้มเหลวตอนลบพื้นหลังเป็นข้อความ และตัดสินว่าลองใหม่ด้วยต้นฉบับเดิมบน R2 ได้ไหม
 */
function processFailure(error: unknown, key: string): Pick<RemoveBgJob, 'error' | 'key'> {
  if (!(error instanceof ApiError)) {
    return { error: errorMessage(error), key }
  }

  switch (error.status) {
    case 402:
      // เครดิตหมด ต้นฉบับยังอยู่ เติมเครดิตแล้วกดลองใหม่ได้เลย
      useUsageStore.getState().reportLimitReached()
      return { error: error.message, key }
    case 403:
    case 429:
    case 503:
      // แอดมินปิดงานนี้อยู่ คิวเต็ม หรือบริการล่มชั่วคราว ยังไม่ได้ตัดเครดิตหรือคืนให้แล้ว และต้นฉบับยังอยู่
      // เปิดกลับหรือว่างเมื่อไรกดลองใหม่ได้เลยโดยไม่ต้องอัปซ้ำ
      return { error: error.message, key }
    case 0:
      /*
        หมดเวลารอหรือเน็ตหลุดระหว่างประมวลผล เซิร์ฟเวอร์อาจทำเสร็จและตัดเครดิตไปแล้ว
        ดึงคลังรูปใหม่ให้เห็น และบอกให้ตรวจก่อน กดลองใหม่เลยอาจเสียเครดิตซ้ำ
      */
      void queryClient.invalidateQueries({ queryKey: queryKeys.removeBg.all })
      void useUsageStore.getState().refresh()
      return { error: i18n.t('removeBg.timeout'), key }
    default:
      // 400 ไม่พบต้นฉบับหรือใหญ่เกิน, 422 รูปเสีย — ต้นฉบับถูกลบแล้ว ลองใหม่ต้องอัปใหม่
      return { error: error.message, key: null }
  }
}

/*
  เตือนก่อนปิดแท็บระหว่างอัปโหลด ไฟล์ที่อัปไม่เสร็จจะหาย
  ช่วงลบพื้นหลังไม่ต้องเตือน เซิร์ฟเวอร์ทำต่อจนจบแล้วเก็บไว้ในคลังรูปเอง
*/
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (useRemoveBgStore.getState().jobs.some(isUploadPending)) event.preventDefault()
  })
}
