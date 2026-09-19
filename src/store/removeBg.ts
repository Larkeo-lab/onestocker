import { create } from 'zustand'

import i18n from '@/config/i18n'
import {
  ApiError,
  removeBackground,
  requestRemoveBgUpload,
  uploadToR2,
} from '@/lib/api'
import { busyRetryDelay, isServerBusy, sleep } from '@/lib/busy'
import { cachedCreditCost } from '@/lib/creditCosts'
import { errorMessage } from '@/lib/error'
import { HEIC_CONVERT_CONCURRENCY, heicToJpeg, isHeicFile } from '@/lib/heic'
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

    วางรูป → (converting) → waitingUpload → uploading → ready   (อัปขึ้น R2 ทันที ยังไม่ใช้เครดิต)
    กดลบพื้นหลัง → queued → processing → done | error             (ตัดเครดิตเมื่อได้ผลลัพธ์เท่านั้น)

  converting มีเฉพาะไฟล์ HEIC ซึ่งถูกแปลงเป็น JPEG บนเครื่องก่อนอัป

  กดลบพื้นหลังระหว่างที่บางรูปยังอัปไม่เสร็จได้ รูปพวกนั้นจะมี format ติดไว้แล้ว
  อัปเสร็จเมื่อไรจะเข้าคิวลบพื้นหลังต่อเอง ไม่ต้องกดซ้ำ
*/
export type RemoveBgJobStatus =
  | 'converting'
  | 'waitingUpload'
  | 'uploading'
  | 'ready'
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'

export type RemoveBgJob = {
  id: string
  /** ไฟล์ที่จะอัป HEIC ถูกแทนด้วย JPEG ที่แปลงแล้วหลังผ่าน converting */
  file: File
  /** object URL ของต้นฉบับ ไว้แสดงระหว่างรอผลลัพธ์ null ระหว่างแปลง HEIC (เบราว์เซอร์ส่วนใหญ่แสดงไม่ได้) */
  sourceUrl: string | null
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
  /** เซิร์ฟเวอร์คิวเต็มหรือผู้ให้บริการจำกัดอัตรา กำลังรอส่งใหม่เอง (สถานะยังเป็น processing) */
  serverBusy: boolean
}

type RemoveBgState = {
  jobs: RemoveBgJob[]
  /** เพิ่มรูปแล้วเริ่มอัปทันที คืนข้อความของไฟล์ที่ถูกข้าม (ชนิดไม่รองรับ ใหญ่เกิน) */
  addFiles: (files: File[]) => string[]
  /** ลบพื้นหลังทุกรูปที่ยังไม่ได้สั่ง ด้วยรูปแบบและระดับคุณภาพที่เลือก */
  start: (format: RemoveBgFormat, quality: RemoveBgQuality) => void
  retry: (id: string) => void
  /** ยกเลิกรูปที่ยังอัปไม่เสร็จ (รวมที่รอแปลง HEIC และรอคิวอัป) หยุดอัปแล้วเอาออกจากรายการ ไม่เสียเครดิต */
  cancelUpload: (id: string) => void
  dismiss: (id: string) => void
  clearDone: () => void
}

/** รูปที่ยังไม่ได้กดลบพื้นหลัง (อัปเสร็จแล้วหรือกำลังอัป) กดปุ่มแล้วจะถูกสั่งรวมไปด้วย */
export function isAwaitingStart(job: RemoveBgJob): boolean {
  return job.format === null && (isUploadPending(job) || job.status === 'ready')
}

/** รูปที่อัปยังไม่เสร็จ ปิดแท็บตอนนี้ไฟล์จะหาย */
export function isUploadPending(job: RemoveBgJob): boolean {
  return job.status === 'converting' || job.status === 'waitingUpload' || job.status === 'uploading'
}

/*
  งานอยู่ใน store ระดับแอป ไม่ใช่ state ของหน้า
  ผู้ใช้กดไปหน้าอื่นระหว่างอัปโหลด งานยังเดินต่อ กลับมาก็ยังเห็นรายการเดิม
*/
export const useRemoveBgStore = create<RemoveBgState>((set, get) => {
  let uploading = 0
  let processing = 0
  // ต้องจำเป็น id เพราะรูปที่รอแปลงกับกำลังแปลงมีสถานะ converting เหมือนกัน
  const converting = new Set<string>()
  // ตัวหยุดการอัปของรูปที่กำลังอัปอยู่ ใช้ตอนผู้ใช้กดยกเลิก
  const uploads = new Map<string, AbortController>()

  function update(id: string, patch: Partial<RemoveBgJob>) {
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
    }))
  }

  function find(id: string) {
    return get().jobs.find((job) => job.id === id)
  }

  function remove(job: RemoveBgJob) {
    if (job.sourceUrl) URL.revokeObjectURL(job.sourceUrl)
    set((state) => ({ jobs: state.jobs.filter((item) => item.id !== job.id) }))
  }

  /*
    คิวอัปกับคิวลบพื้นหลังแยกกัน รูปที่อัปเสร็จแล้วไม่ต้องรอไฟล์ใหญ่ใบอื่นอัปให้เสร็จก่อน
    ทั้งสองคิวเปลี่ยนสถานะก่อนเริ่มงาน รอบถัดของลูปจะได้ไม่หยิบรูปเดิมซ้ำ
  */
  function pump() {
    while (converting.size < HEIC_CONVERT_CONCURRENCY) {
      const next = get().jobs.find((job) => job.status === 'converting' && !converting.has(job.id))
      if (!next) break
      converting.add(next.id)
      void convert(next.id).finally(() => {
        converting.delete(next.id)
        pump()
      })
    }

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

  async function convert(id: string) {
    const job = find(id)
    if (!job) return
    try {
      const file = await heicToJpeg(job.file)
      // ผู้ใช้กดยกเลิกระหว่างแปลง (แปลงกลางทางหยุดไม่ได้) ไม่ต้องทำต่อ
      if (!find(id)) return
      // JPEG ใหญ่กว่า HEIC ราวสองเท่า ไฟล์ที่ผ่านตอนเลือกอาจเกินเพดานหลังแปลง
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        update(id, { status: 'error', error: i18n.t('removeBg.tooLarge', { name: job.file.name, size: MAX_UPLOAD_MB }) })
        return
      }
      update(id, { file, sourceUrl: URL.createObjectURL(file), status: 'waitingUpload' })
    } catch (error) {
      console.error('แปลง HEIC ไม่สำเร็จ', error)
      update(id, { status: 'error', error: i18n.t('removeBg.heicFailed', { name: job.file.name }) })
    }
  }

  async function upload(id: string) {
    const job = find(id)
    if (!job) return
    const controller = new AbortController()
    uploads.set(id, controller)
    try {
      const link = await requestRemoveBgUpload(job.file)
      if (controller.signal.aborted) return
      await uploadToR2(link.url, job.file, (progress) => update(id, { progress }), controller.signal)
      // อ่านใหม่ ผู้ใช้อาจกดลบพื้นหลังระหว่างที่กำลังอัป
      const current = find(id)
      update(id, { key: link.key, status: current?.format ? 'queued' : 'ready' })
    } catch (error) {
      // ยกเลิกแล้วแถวถูกเอาออกไปแล้ว ไม่ใช่ error
      if (controller.signal.aborted) return
      update(id, { status: 'error', error: errorMessage(error), key: null })
    } finally {
      uploads.delete(id)
    }
  }

  async function process(id: string) {
    const job = find(id)
    if (!job?.key || !job.format || !job.quality) return
    // id ของรูปนี้เป็น requestId ทุกรอบ รวมตอนกดลองใหม่ งานที่เซิร์ฟเวอร์ทำเสร็จไปแล้วได้ผลเดิม ไม่ตัดเครดิตซ้ำ
    const input = { requestId: id, key: job.key, filename: job.file.name, format: job.format, quality: job.quality }

    for (let attempt = 1; ; attempt++) {
      try {
        const result = await removeBackground(input)
        update(id, { status: 'done', result, key: null, serverBusy: false })

        useUsageStore.getState().markUsed(cachedCreditCost(QUALITY_FEATURE[job.quality]))
        void queryClient.invalidateQueries({ queryKey: queryKeys.removeBg.all })
        return
      } catch (error) {
        /*
          คิวเต็ม หรือ Replicate/Cloudflare จำกัดอัตรา ยังไม่ได้เริ่มทำและไม่เสียเครดิต
          รอแล้วส่งใหม่เองจนกว่าจะได้ ผู้ใช้เห็นว่ากำลังรอคิวแทน error
          ถือช่องของแท็บนี้ไว้ระหว่างรอ ไม่ส่งรูปถัดไปไปเบียดคิวเพิ่ม
          ผู้ใช้กดเอารูปออกระหว่างรอได้ ถ้าหายไปแล้วก็เลิกส่ง
        */
        if (isServerBusy(error)) {
          update(id, { serverBusy: true })
          await sleep(busyRetryDelay(attempt))
          if (!find(id)) return
          continue
        }
        update(id, { status: 'error', serverBusy: false, ...processFailure(error, job.key) })
        return
      }
    }
  }

  return {
    jobs: [],

    addFiles: (files) => {
      const skipped: string[] = []
      const added: RemoveBgJob[] = []

      for (const file of files) {
        const heic = isHeicFile(file)
        if (!heic && !ACCEPTED_TYPES.includes(file.type)) {
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
          sourceUrl: heic ? null : URL.createObjectURL(file),
          format: null,
          quality: null,
          status: heic ? 'converting' : 'waitingUpload',
          progress: 0,
          key: null,
          result: null,
          error: null,
          serverBusy: false,
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
        ยังเป็น HEIC อยู่ (แปลงไม่สำเร็จ) ต้องแปลงใหม่ก่อน เซิร์ฟเวอร์ไม่รับ HEIC
      */
      const next = job.key && job.format && job.quality ? 'queued' : isHeicFile(job.file) ? 'converting' : 'waitingUpload'
      update(id, { status: next, error: null })
      pump()
    },

    cancelUpload: (id) => {
      const job = find(id)
      if (!job || !isUploadPending(job)) return
      /*
        หยุดคำขอที่กำลังส่งขึ้น R2 ช่องอัปจะว่างให้รูปถัดไปเมื่อ upload จบ
        รอแปลง HEIC อยู่หยุดไม่ได้ แปลงเสร็จแล้วหาแถวไม่เจอก็เลิกเอง
      */
      uploads.get(id)?.abort()
      remove(job)
    },

    dismiss: (id) => {
      const job = find(id)
      /*
        กำลังทำอยู่เอาออกไม่ได้ งานจะยังเดินต่อแล้วหาแถวไม่เจอ
        ยกเว้นตอนรอคิว (serverBusy) ลูปรอจะเลิกส่งเอง ถ้าคำขอที่ค้างอยู่บังเอิญสำเร็จ
        ผลลัพธ์ยังไปอยู่ในคลังรูปตามปกติ
      */
      const working = job?.status === 'converting' || job?.status === 'uploading' || (job?.status === 'processing' && !job.serverBusy)
      if (!job || working) return
      remove(job)
    },

    clearDone: () => {
      const done = get().jobs.filter((job) => job.status === 'done')
      for (const job of done) if (job.sourceUrl) URL.revokeObjectURL(job.sourceUrl)
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
    case 404:
    case 503:
      // แอดมินปิดงานนี้อยู่ งานหายเพราะเซิร์ฟเวอร์เริ่มใหม่กลางงาน หรือบริการใช้ไม่ได้ (ปิดปรับปรุง) ไม่ได้ตัดเครดิต และต้นฉบับยังอยู่
      // (429 ไม่มาถึงตรงนี้ process รอแล้วส่งใหม่เอง)
      // เปิดกลับหรือว่างเมื่อไรกดลองใหม่ได้เลยโดยไม่ต้องอัปซ้ำ
      return { error: error.message, key }
    case 0:
      /*
        เน็ตหลุดนานจนไม่รู้ผล เซิร์ฟเวอร์อาจทำเสร็จและตัดเครดิตไปแล้ว อ่านคลังรูปและเครดิตใหม่ให้ตรงความจริง
        กดลองใหม่ได้ปลอดภัย ส่ง requestId เดิม งานที่เสร็จแล้วได้ผลเดิมโดยไม่ตัดซ้ำ
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
  และระหว่างรอคิวเซิร์ฟเวอร์ แท็บนี้เป็นคนส่งใหม่ ปิดไปแล้วรูปนั้นจะไม่ถูกทำ
  ช่วงลบพื้นหลังจริงไม่ต้องเตือน เซิร์ฟเวอร์ทำต่อจนจบแล้วเก็บไว้ในคลังรูปเอง
*/
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (useRemoveBgStore.getState().jobs.some((job) => isUploadPending(job) || job.serverBusy)) event.preventDefault()
  })
}
