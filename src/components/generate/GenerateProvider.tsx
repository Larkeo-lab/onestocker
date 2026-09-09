import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import {
  FALLBACK_MAX_ASSETS,
  GENERATE_CONCURRENCY,
  UPLOAD_CONCURRENCY,
} from '@/config/site'
import { useAsync } from '@/hooks/useAsync'
import {
  fetchMeta,
  generateMetadata,
  requestUploadUrls,
  uploadToR2,
} from '@/lib/api'
import { runWithConcurrency } from '@/lib/concurrency'
import { processImage } from '@/lib/image'
import type { Asset } from '@/types/asset'

import { GenerateContext, isPending } from './context'

/**
 * เก็บรูปและผลลัพธ์ที่กำลังทำอยู่
 *
 * ตัว provider นี้ถูกวางไว้ที่ layout route ไม่ใช่ในหน้า Generate
 * เพราะ React จะถอด component ของหน้าออกเมื่อผู้ใช้เปลี่ยนไปหน้าอื่น
 * ถ้าเก็บ state ไว้ในหน้า พอกลับมางานที่ทำค้างไว้จะหายหมด
 *
 * ข้อจำกัด: ถ้ารีเฟรชหน้าเว็บทั้งหน้า ข้อมูลจะหาย เพราะรูปตัวอย่างเป็น
 * blob ที่ผูกกับหน้าเว็บนั้น ๆ ไม่ได้เก็บลงดิสก์
 */

/** ชนิดไฟล์ที่เบราว์เซอร์ย่อได้ ต้นฉบับไม่ถูกอัปขึ้นคลาวด์ */
const ACCEPTED_INPUT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** ย่อรูปพร้อมกันกี่รูป มากกว่านี้แท็บจะหน่วงตอนอัปทีเดียวหลายสิบรูป */
const PROCESS_CONCURRENCY = 3

/** ชื่อไฟล์ที่แสดงในข้อความเตือน เกินกว่านี้ย่อเป็น "และอีก N ไฟล์" */
const NAMES_IN_NOTICE = 3

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก'
}

/** ไฟล์ที่ไม่ได้เข้ารอบนี้ พร้อมเหตุผล ใช้ประกอบข้อความเตือน */
type Skipped = { filename: string; reason: string }

function describeSkipped(skipped: Skipped[]): string | null {
  if (skipped.length === 0) return null

  const shown = skipped
    .slice(0, NAMES_IN_NOTICE)
    .map((item) => item.filename)
    .join(', ')
  const rest = skipped.length - NAMES_IN_NOTICE
  const reasons = [...new Set(skipped.map((item) => item.reason))].join(' · ')

  return `เพิ่มไม่ได้ ${skipped.length} ไฟล์: ${shown}${
    rest > 0 ? ` และอีก ${rest} ไฟล์` : ''
  } — ${reasons}`
}

export function GenerateProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  // เพดานจำนวนรูปเซิร์ฟเวอร์เป็นเจ้าของ ระหว่างรอคำตอบใช้ค่าสำรองไปก่อน
  const meta = useAsync(fetchMeta)
  const maxAssets = meta.data?.maxAssets ?? FALLBACK_MAX_ASSETS

  /**
   * สำเนาของ assets ที่อ่านได้ทันทีโดยไม่ต้องรอ re-render
   * จำเป็นเพราะงานอัปโหลดเป็น async — ถ้าอ่านจาก state ตรง ๆ
   * การอัปรอบถัดไปอาจนับจำนวนรูปผิดจนเกินเพดาน
   */
  const assetsRef = useRef<Asset[]>([])

  // เหตุผลเดียวกับ assetsRef — addFiles ถูกสร้างครั้งเดียวแต่ maxAssets
  // เปลี่ยนได้ทีหลังตอน /meta ตอบกลับมา
  const maxAssetsRef = useRef(maxAssets)
  useEffect(() => {
    maxAssetsRef.current = maxAssets
  }, [maxAssets])

  /** blob URL ที่สร้างไว้ต่อรูป ต้องคืนหน่วยความจำเมื่อเลิกใช้ */
  const objectUrls = useRef(new Map<string, string>())

  /** เขียน state พร้อมอัปเดตสำเนาใน ref ให้ตรงกันเสมอ */
  const commit = useCallback((update: (prev: Asset[]) => Asset[]) => {
    setAssets((prev) => {
      const next = update(prev)
      assetsRef.current = next
      return next
    })
  }, [])

  /** แก้เฉพาะรูปที่ยังอยู่ ถ้าผู้ใช้ลบไปแล้วจะไม่มีอะไรเกิดขึ้น */
  const patch = useCallback(
    (id: string, changes: Partial<Asset>) => {
      commit((prev) =>
        prev.map((asset) =>
          asset.id === id ? { ...asset, ...changes } : asset,
        ),
      )
    },
    [commit],
  )

  const releaseAll = useCallback(() => {
    for (const url of objectUrls.current.values()) {
      URL.revokeObjectURL(url)
    }
    objectUrls.current.clear()
  }, [])

  // คืนหน่วยความจำเมื่อออกจาก layout ไปเลย ไม่ใช่ตอนสลับหน้าภายใน
  useEffect(() => releaseAll, [releaseAll])

  const remove = useCallback(
    (id: string) => {
      const url = objectUrls.current.get(id)
      if (url) {
        URL.revokeObjectURL(url)
        objectUrls.current.delete(id)
      }
      commit((prev) => prev.filter((asset) => asset.id !== id))
    },
    [commit],
  )

  const addFiles = useCallback(
    async (files: File[]) => {
      const limit = maxAssetsRef.current
      const accepted = files.filter((file) =>
        ACCEPTED_INPUT_TYPES.includes(file.type),
      )

      // นับจาก ref ไม่ใช่ state เผื่อมีชุดก่อนหน้ายังอัปไม่เสร็จ
      const room = Math.max(0, limit - assetsRef.current.length)
      const queued = accepted.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        file,
      }))

      /**
       * ไฟล์ที่ไม่ได้เข้ารอบนี้ ทยอยเติมระหว่างอัปแล้วอัปเดตข้อความเตือน
       * รูปที่อัปไม่สำเร็จจะถูกถอดออกจากรายการ ไม่ค้างไว้กินโควตา
       * เหลือไว้แต่รูปที่เพิ่มสำเร็จ ที่ว่างจึงเปิดให้เติมรูปใหม่ได้ทันที
       */
      const skipped: Skipped[] = [
        ...files
          .filter((file) => !ACCEPTED_INPUT_TYPES.includes(file.type))
          .map((file) => ({
            filename: file.name,
            reason: 'ชนิดไฟล์ไม่รองรับ',
          })),
        ...accepted.slice(room).map((file) => ({
          filename: file.name,
          reason: `เกินเพดาน ${limit} รูป`,
        })),
      ]

      const drop = (id: string, filename: string, reason: string) => {
        remove(id)
        skipped.push({ filename, reason })
        setNotice(describeSkipped(skipped))
      }

      setNotice(describeSkipped(skipped))
      if (queued.length === 0) return

      commit((prev) => [
        ...prev,
        ...queued.map(({ id, file }) => ({
          id,
          filename: file.name,
          previewUrl: '',
          width: 0,
          height: 0,
          size: file.size,
          status: 'uploading' as const,
          title: '',
          description: '',
          keywords: [],
          category: '',
        })),
      ])

      // ย่อรูปก่อน เพื่อให้รู้ชนิดและขนาดจริงของไฟล์ที่จะอัปตอนขอลิงก์
      const processed: {
        id: string
        filename: string
        blob: Blob
        contentType: string
      }[] = []

      await runWithConcurrency(
        queued.map(({ id, file }) => async () => {
          try {
            const image = await processImage(file)
            const previewUrl = URL.createObjectURL(image.blob)
            objectUrls.current.set(id, previewUrl)

            patch(id, {
              previewUrl,
              width: image.width,
              height: image.height,
            })
            processed.push({
              id,
              filename: file.name,
              blob: image.blob,
              contentType: image.contentType,
            })
          } catch (error) {
            drop(id, file.name, errorMessage(error))
          }
        }),
        PROCESS_CONCURRENCY,
      )

      if (processed.length === 0) return

      // ขอลิงก์ทั้งชุดในคำขอเดียว เพดานต่อรอบยังต่ำกว่าที่ API รับไหว
      let uploads
      try {
        uploads = await requestUploadUrls(
          processed.map((item) => ({
            filename: item.filename,
            contentType: item.contentType,
          })),
        )
      } catch (error) {
        for (const item of processed) {
          drop(item.id, item.filename, errorMessage(error))
        }
        return
      }

      // เซิร์ฟเวอร์ตอบลิงก์เรียงตามลำดับที่ส่งไป จับคู่ด้วยตำแหน่ง
      await runWithConcurrency(
        processed.map((item, index) => async () => {
          const upload = uploads[index]
          if (!upload) {
            drop(item.id, item.filename, 'ไม่ได้รับลิงก์อัปโหลดจากเซิร์ฟเวอร์')
            return
          }
          try {
            await uploadToR2(upload.url, item.blob)
            patch(item.id, { status: 'ready', previewKey: upload.key })
          } catch (error) {
            drop(item.id, item.filename, errorMessage(error))
          }
        }),
        UPLOAD_CONCURRENCY,
      )
    },
    [commit, patch, remove],
  )

  const clear = useCallback(() => {
    releaseAll()
    setNotice(null)
    commit(() => [])
  }, [commit, releaseAll])

  const regenerate = useCallback(
    async (id: string) => {
      const asset = assetsRef.current.find((item) => item.id === id)
      if (!asset?.previewKey) return

      patch(id, { status: 'generating', error: undefined, notes: undefined })

      try {
        const result = await generateMetadata({
          previewKey: asset.previewKey,
          filename: asset.filename,
        })
        patch(id, {
          status: 'generated',
          title: result.title,
          description: result.description,
          keywords: result.keywords,
          category: result.category,
          translations: result.translations,
          notes: result.notes,
        })
      } catch (error) {
        patch(id, { status: 'error', error: errorMessage(error) })
      }
    },
    [patch],
  )

  const generate = useCallback(async () => {
    const targets = assetsRef.current.filter(isPending)
    await runWithConcurrency(
      targets.map((asset) => () => regenerate(asset.id)),
      GENERATE_CONCURRENCY,
    )
  }, [regenerate])

  return (
    <GenerateContext
      value={{
        assets,
        notice,
        maxAssets,
        addFiles,
        generate,
        regenerate,
        remove,
        clear,
      }}
    >
      {children}
    </GenerateContext>
  )
}
