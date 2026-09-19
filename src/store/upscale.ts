import { create } from 'zustand'

import i18n from '@/config/i18n'
import { ApiError, requestUpscaleUpload, upscaleImage, uploadToR2, type UpscaleSource } from '@/lib/api'
import { busyRetryDelay, isServerBusy, sleep } from '@/lib/busy'
import { cachedCreditCosts, upscaleCost } from '@/lib/creditCosts'
import { errorMessage } from '@/lib/error'
import { HEIC_CONVERT_CONCURRENCY, heicToJpeg, isHeicFile } from '@/lib/heic'
import { queryClient, queryKeys } from '@/lib/query'
import {
  ACCEPTED_TYPES,
  MAX_INPUT_MB,
  UPLOAD_ATTEMPTS,
  UPSCALE_CONCURRENCY,
  UPSCALE_UPLOAD_CONCURRENCY,
  defaultPreset,
  presetOptions,
  readImageSize,
} from '@/lib/upscale'
import { useUsageStore } from '@/store/usage'
import type { LibraryImage, LibraryKind, UpscalePreset, UpscaleResult } from '@/types/upscale'

/*
  ขั้นตอนของรูปหนึ่งใบ

    จากเครื่อง: (converting) → measuring → waitingUpload → uploading → ready
    จากคลังรูป: ready ทันที (ขนาดรู้อยู่แล้ว ไฟล์อยู่บน R2 แล้ว)
    กดอัปสเกล: queued → processing → done | error

  converting มีเฉพาะไฟล์ HEIC ซึ่งถูกแปลงเป็น JPEG บนเครื่องก่อน (เบราว์เซอร์และเซิร์ฟเวอร์อ่าน HEIC ไม่ได้)
  รูปที่ขยายไม่ได้เลย (ใหญ่เท่า 8K แล้ว เล็กเกินกว่า AI ขยายถึง หรือไฟล์ใหญ่เกิน) ไม่ต้องอัป ขึ้น error ตั้งแต่ตรวจขนาด
  กดอัปสเกลระหว่างที่บางรูปยังอัปไม่เสร็จได้ อัปเสร็จเมื่อไรเข้าคิวต่อเอง
*/
export type UpscaleJobStatus =
  | 'converting'
  | 'measuring'
  | 'waitingUpload'
  | 'uploading'
  | 'ready'
  | 'queued'
  | 'processing'
  | 'done'
  | 'error'

export type UpscaleJob = {
  id: string
  /** ไฟล์ HEIC ถูกแทนด้วย JPEG ที่แปลงแล้วหลังผ่าน converting */
  source: { type: 'file'; file: File } | { type: 'library'; kind: LibraryKind; libraryId: string }
  filename: string
  /** object URL ของไฟล์ในเครื่อง หรือรูปย่อของรูปในคลัง null ระหว่างแปลง HEIC (เบราว์เซอร์ส่วนใหญ่แสดงไม่ได้) */
  previewUrl: string | null
  /** ลิงก์ไฟล์เต็มของรูปจากคลัง ใช้เทียบก่อน/หลัง (ดู originalUrl) */
  libraryUrl?: string | null
  /** ขนาดที่เลือกปกติใช้เวลาราวกี่วินาที ได้จากเซิร์ฟเวอร์ตอนรับงาน null = ยังบอกไม่ได้ */
  estimateSeconds?: number | null
  /** png แสดงบนลายตารางให้เห็นส่วนโปร่งใส */
  transparent: boolean
  /** null ระหว่างวัดขนาด */
  width: number | null
  height: number | null
  sizeBytes: number
  /** ขนาดที่เลือก null = ยังไม่มีขนาดให้เลือก */
  preset: UpscalePreset | null
  /** กดอัปสเกลแล้ว ขนาดที่เลือกไว้ถูกล็อก */
  started: boolean
  status: UpscaleJobStatus
  /** 0–100 ระหว่างอัปโหลด */
  progress: number
  /** key ของต้นฉบับที่อัปจากเครื่อง ลองใหม่ได้โดยไม่ต้องอัปซ้ำ */
  uploadKey: string | null
  result: UpscaleResult | null
  error: string | null
  /** เซิร์ฟเวอร์คิวเต็มหรือ Replicate จำกัดอัตรา กำลังรอส่งใหม่เอง (สถานะยังเป็น processing) */
  serverBusy: boolean
}

type UpscaleState = {
  jobs: UpscaleJob[]
  /** เพิ่มรูปจากเครื่อง คืนข้อความของไฟล์ที่ถูกข้าม */
  addFiles: (files: File[]) => string[]
  /** เพิ่มรูปจากคลัง คืนข้อความของรูปที่ถูกข้าม */
  addLibraryImages: (images: LibraryImage[]) => string[]
  setPreset: (id: string, preset: UpscalePreset) => void
  /** อัปสเกลทุกรูปที่เลือกขนาดไว้แล้วและยังไม่ได้สั่ง */
  start: () => void
  retry: (id: string) => void
  dismiss: (id: string) => void
  clearDone: () => void
}

/** รูปที่จะถูกสั่งอัปสเกลเมื่อกดปุ่ม */
export function isAwaitingStart(job: UpscaleJob): boolean {
  return (
    !job.started &&
    job.preset !== null &&
    (job.status === 'waitingUpload' || job.status === 'uploading' || job.status === 'ready')
  )
}

/**
 * ต้นฉบับขนาดเต็มสำหรับเทียบก่อน/หลังในหน้าดูรูป
 * รูปจากเครื่องใช้ object URL ของไฟล์ (previewUrl) รูปจากคลังใช้ลิงก์ไฟล์เต็ม ไม่มีใช้รูปย่อแทน
 */
export function originalUrl(job: UpscaleJob): string | null {
  return job.source.type === 'file' ? job.previewUrl : (job.libraryUrl ?? job.previewUrl)
}

/** รูปที่อัปยังไม่เสร็จ ปิดแท็บตอนนี้ไฟล์จะหาย */
export function isUploadPending(job: UpscaleJob): boolean {
  return (
    job.status === 'converting' ||
    job.status === 'measuring' ||
    job.status === 'waitingUpload' ||
    job.status === 'uploading'
  )
}

export const useUpscaleStore = create<UpscaleState>((set, get) => {
  let uploading = 0
  let processing = 0
  // ต้องจำเป็น id เพราะรูปที่รอแปลงกับกำลังแปลงมีสถานะ converting เหมือนกัน
  const converting = new Set<string>()

  function update(id: string, patch: Partial<UpscaleJob>) {
    set((state) => ({ jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)) }))
  }

  function find(id: string) {
    return get().jobs.find((job) => job.id === id)
  }

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

    while (uploading < UPSCALE_UPLOAD_CONCURRENCY) {
      const next = get().jobs.find((job) => job.status === 'waitingUpload')
      if (!next) break
      uploading += 1
      update(next.id, { status: 'uploading', progress: 0, error: null })
      void upload(next.id).finally(() => {
        uploading -= 1
        pump()
      })
    }

    while (processing < UPSCALE_CONCURRENCY) {
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

  /** แปลง HEIC เป็น JPEG แล้ววัดขนาดต่อ ถือช่องแปลงไว้จนวัดเสร็จ รูปเต็มจะได้ไม่ถูกถอดรหัสพร้อมกันหลายใบ */
  async function convert(id: string) {
    const job = find(id)
    if (!job || job.source.type !== 'file') return
    const original = job.source.file
    try {
      const file = await heicToJpeg(original)
      // ผู้ใช้เอารูปออกระหว่างแปลง (แปลงกลางทางหยุดไม่ได้) ไม่ต้องทำต่อ
      if (!find(id)) return
      // JPEG ใหญ่กว่า HEIC ราวสองเท่า ไฟล์ที่ผ่านตอนเลือกอาจเกินเพดานหลังแปลง
      if (file.size > MAX_INPUT_MB * 1024 * 1024) {
        update(id, { status: 'error', error: i18n.t('upscale.tooLarge', { name: original.name, size: MAX_INPUT_MB }) })
        return
      }
      update(id, {
        source: { type: 'file', file },
        filename: file.name,
        previewUrl: URL.createObjectURL(file),
        sizeBytes: file.size,
        status: 'measuring',
      })
      await measure(id, file)
    } catch (error) {
      console.error('แปลง HEIC ไม่สำเร็จ', error)
      update(id, { status: 'error', error: i18n.t('upscale.heicFailed', { name: original.name }) })
    }
  }

  /** วัดขนาดรูปจากเครื่อง แล้วเลือกขนาดตั้งต้นให้ รูปที่ขยายไม่ได้ไม่ต้องอัป */
  async function measure(id: string, file: File) {
    try {
      const { width, height } = await readImageSize(file)
      const job = find(id)
      const preset = defaultPreset(presetOptions(width, height, cachedCreditCosts(), job?.transparent ?? false))
      update(id, {
        width,
        height,
        preset,
        ...(preset
          ? { status: 'waitingUpload' as const }
          : { status: 'error' as const, error: i18n.t('upscale.noOption') }),
      })
    } catch {
      update(id, { status: 'error', error: i18n.t('upscale.unreadable') })
    }
    pump()
  }

  async function upload(id: string) {
    const job = find(id)
    if (!job || job.source.type !== 'file') return
    const file = job.source.file
    for (let attempt = 1; ; attempt++) {
      try {
        // ขอลิงก์ใหม่ทุกรอบ ลิงก์เดิมอาจหมดอายุระหว่างรอ
        const link = await requestUpscaleUpload(file)
        await uploadToR2(link.url, file, (progress) => update(id, { progress }))
        // อ่านใหม่ ผู้ใช้อาจกดอัปสเกลระหว่างที่กำลังอัป
        update(id, { uploadKey: link.key, status: find(id)?.started ? 'queued' : 'ready' })
        return
      } catch (error) {
        // เน็ตสะดุดกลางทาง อัปใหม่เองสองสามรอบ ไฟล์ที่เซิร์ฟเวอร์ไม่รับ (4xx) อัปใหม่ก็ไม่ผ่าน
        const rejected = error instanceof ApiError && error.status >= 400 && error.status < 500
        if (rejected || attempt >= UPLOAD_ATTEMPTS || !find(id)) {
          update(id, { status: 'error', error: errorMessage(error), uploadKey: null })
          return
        }
        update(id, { progress: 0 })
        await sleep(2_000 * attempt)
      }
    }
  }

  async function process(id: string) {
    const job = find(id)
    if (!job?.preset) return
    let source: UpscaleSource
    if (job.source.type === 'library') {
      source = { libraryKind: job.source.kind, libraryId: job.source.libraryId }
    } else if (job.uploadKey) {
      source = { uploadKey: job.uploadKey }
    } else {
      return
    }

    // id ของรูปนี้เป็น requestId ทุกรอบ รวมตอนกดลองใหม่ งานที่เซิร์ฟเวอร์ทำเสร็จไปแล้วได้ผลเดิม ไม่ตัดเครดิตซ้ำ
    const input = { requestId: id, source, filename: job.filename, preset: job.preset }

    for (let attempt = 1; ; attempt++) {
      try {
        // ได้คิวแล้วเลิกแสดงว่ารอคิว (ถ้าเคยโดน 429 มาก่อน) งานกำลังทำจริง
        const result = await upscaleImage(input, (started) =>
          update(id, { serverBusy: false, estimateSeconds: started.estimateSeconds ?? null }),
        )
        update(id, { status: 'done', result, uploadKey: null, serverBusy: false })
        // ราคาแยกตามขนาดที่เลือก
        useUsageStore.getState().markUsed(upscaleCost(cachedCreditCosts(), job.preset) ?? 1)
        void queryClient.invalidateQueries({ queryKey: queryKeys.upscale.all })
        return
      } catch (error) {
        /*
          คิวเต็ม หรือ Replicate จำกัดอัตรา ยังไม่ได้ทำเสร็จและไม่เสียเครดิต
          รอแล้วส่งใหม่เองจนกว่าจะได้ ผู้ใช้เห็นว่ากำลังรอคิวแทน error
          ผู้ใช้กดเอารูปออกระหว่างรอได้ ถ้าหายไปแล้วก็เลิกส่ง
        */
        if (isServerBusy(error)) {
          update(id, { serverBusy: true })
          await sleep(busyRetryDelay(attempt))
          if (!find(id)) return
          continue
        }
        update(id, { status: 'error', serverBusy: false, ...processFailure(error, job.uploadKey) })
        return
      }
    }
  }

  return {
    jobs: [],

    addFiles: (files) => {
      const skipped: string[] = []
      const added: UpscaleJob[] = []
      for (const file of files) {
        const heic = isHeicFile(file)
        if (!heic && !ACCEPTED_TYPES.includes(file.type)) {
          skipped.push(i18n.t('upscale.invalidType', { name: file.name }))
          continue
        }
        if (file.size > MAX_INPUT_MB * 1024 * 1024) {
          skipped.push(i18n.t('upscale.tooLarge', { name: file.name, size: MAX_INPUT_MB }))
          continue
        }
        added.push({
          id: crypto.randomUUID(),
          source: { type: 'file', file },
          filename: file.name,
          previewUrl: heic ? null : URL.createObjectURL(file),
          transparent: file.type === 'image/png',
          width: null,
          height: null,
          sizeBytes: file.size,
          preset: null,
          started: false,
          status: heic ? 'converting' : 'measuring',
          progress: 0,
          uploadKey: null,
          result: null,
          error: null,
          serverBusy: false,
        })
      }
      if (added.length > 0) {
        set((state) => ({ jobs: [...state.jobs, ...added] }))
        for (const job of added) {
          if (job.status === 'measuring' && job.source.type === 'file') void measure(job.id, job.source.file)
        }
        // HEIC รอเข้าคิวแปลงทีละไฟล์ แปลงเสร็จแล้วค่อยวัดขนาดต่อ
        pump()
      }
      return skipped
    },

    addLibraryImages: (images) => {
      const skipped: string[] = []
      const added: UpscaleJob[] = []
      const existing = get().jobs
      for (const image of images) {
        const duplicate = existing.some(
          (job) =>
            job.source.type === 'library' &&
            job.source.libraryId === image.id &&
            job.status !== 'done' &&
            job.status !== 'error',
        )
        if (duplicate) {
          skipped.push(i18n.t('upscale.alreadyAdded', { name: image.filename }))
          continue
        }
        const tooLarge = image.sizeBytes > MAX_INPUT_MB * 1024 * 1024
        const preset = tooLarge
          ? null
          : defaultPreset(presetOptions(image.width, image.height, cachedCreditCosts(), image.format === 'png'))
        added.push({
          id: crypto.randomUUID(),
          source: { type: 'library', kind: image.kind, libraryId: image.id },
          filename: image.filename,
          previewUrl: image.previewUrl,
          libraryUrl: image.url,
          transparent: image.format === 'png',
          width: image.width,
          height: image.height,
          sizeBytes: image.sizeBytes,
          preset,
          started: false,
          status: preset ? 'ready' : 'error',
          progress: 0,
          uploadKey: null,
          result: null,
          error: preset
            ? null
            : tooLarge
              ? i18n.t('upscale.inputTooLarge', { size: MAX_INPUT_MB })
              : i18n.t('upscale.noOption'),
          serverBusy: false,
        })
      }
      if (added.length > 0) set((state) => ({ jobs: [...state.jobs, ...added] }))
      return skipped
    },

    setPreset: (id, preset) => {
      const job = find(id)
      if (!job || job.started) return
      update(id, { preset })
    },

    start: () => {
      set((state) => ({
        jobs: state.jobs.map((job) =>
          isAwaitingStart(job)
            ? { ...job, started: true, status: job.status === 'ready' ? 'queued' : job.status }
            : job,
        ),
      }))
      pump()
    },

    retry: (id) => {
      const job = find(id)
      if (!job || job.status !== 'error' || !job.preset || job.width === null) return
      /*
        รูปจากคลังหรือรูปที่อัปแล้ว สั่งใหม่ได้เลย
        รูปจากเครื่องที่ยังไม่มีต้นฉบับบน R2 ต้องอัปใหม่ ถ้าเคยกดอัปสเกลไว้ อัปเสร็จจะเข้าคิวต่อเอง
      */
      const canProcess = job.source.type === 'library' || job.uploadKey !== null
      update(id, {
        error: null,
        status: canProcess ? (job.started ? 'queued' : 'ready') : 'waitingUpload',
      })
      pump()
    },

    dismiss: (id) => {
      const job = find(id)
      // กำลังทำอยู่เอาออกไม่ได้ ยกเว้นตอนรอคิว (serverBusy) ลูปรอจะเลิกส่งเอง
      const working =
        job?.status === 'converting' ||
        job?.status === 'uploading' ||
        job?.status === 'measuring' ||
        (job?.status === 'processing' && !job.serverBusy)
      if (!job || working) return
      if (job.source.type === 'file' && job.previewUrl) URL.revokeObjectURL(job.previewUrl)
      set((state) => ({ jobs: state.jobs.filter((item) => item.id !== id) }))
    },

    clearDone: () => {
      for (const job of get().jobs) {
        if (job.status === 'done' && job.source.type === 'file' && job.previewUrl) URL.revokeObjectURL(job.previewUrl)
      }
      set((state) => ({ jobs: state.jobs.filter((job) => job.status !== 'done') }))
    },
  }
})

/** แปลงความล้มเหลวตอนอัปสเกลเป็นข้อความ และตัดสินว่ายังใช้ต้นฉบับที่อัปไว้ได้ไหม */
function processFailure(error: unknown, uploadKey: string | null): Pick<UpscaleJob, 'error' | 'uploadKey'> {
  if (!(error instanceof ApiError)) return { error: errorMessage(error), uploadKey }

  switch (error.status) {
    case 402:
      useUsageStore.getState().reportLimitReached()
      return { error: error.message, uploadKey }
    case 403:
    case 404:
    case 503:
      /*
        แอดมินปิดขนาดนี้อยู่ งานหายเพราะเซิร์ฟเวอร์เริ่มใหม่กลางงาน หรือ Replicate ใช้ไม่ได้
        ไม่ได้ตัดเครดิต ต้นฉบับยังอยู่ ลองใหม่ได้เลยโดยไม่ต้องอัปซ้ำ
        (429 ไม่มาถึงตรงนี้ process รอแล้วส่งใหม่เอง)
      */
      return { error: error.message, uploadKey }
    case 0:
      /*
        เน็ตหลุดนานจนไม่รู้ผล เซิร์ฟเวอร์อาจทำเสร็จและตัดเครดิตไปแล้ว อ่านคลังรูปและเครดิตใหม่ให้ตรงความจริง
        กดลองใหม่ได้ปลอดภัย ส่ง requestId เดิม งานที่เสร็จแล้วได้ผลเดิมโดยไม่ตัดซ้ำ
      */
      void queryClient.invalidateQueries({ queryKey: queryKeys.upscale.all })
      void useUsageStore.getState().refresh()
      return { error: i18n.t('upscale.timeout'), uploadKey }
    default:
      // 400 / 422 ต้นฉบับที่อัปไว้อาจไม่มีแล้ว ลองใหม่ให้อัปใหม่
      return { error: error.message, uploadKey: null }
  }
}

/*
  เตือนก่อนปิดแท็บระหว่างอัปโหลด ไฟล์ที่อัปไม่เสร็จจะหาย
  และระหว่างรอคิว แท็บนี้เป็นคนส่งใหม่ ปิดไปแล้วรูปนั้นจะไม่ถูกทำ
*/
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (useUpscaleStore.getState().jobs.some((job) => isUploadPending(job) || job.serverBusy)) event.preventDefault()
  })
}
