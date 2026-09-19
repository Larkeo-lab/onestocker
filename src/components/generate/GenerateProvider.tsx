import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import {
  FALLBACK_MAX_ASSETS,
  GENERATE_CONCURRENCY,
  UPLOAD_CONCURRENCY,
} from '@/config/site'
import i18n from '@/config/i18n'
import { useMeta } from '@/hooks/queries'
import {
  ApiError,
  generateMetadata,
  requestUploadUrls,
  uploadToR2,
  type PresignedUpload,
  type UploadPurpose,
} from '@/lib/api'
import { busyRetryDelay, isServerBusy, sleep } from '@/lib/busy'
import { runWithConcurrency } from '@/lib/concurrency'
import { cachedCreditCost } from '@/lib/creditCosts'
import { processImage } from '@/lib/image'
import { queryClient, queryKeys } from '@/lib/query'
import { mediaKindOf } from '@/lib/media'
import { processVideo } from '@/lib/video'
import type { Asset } from '@/types/asset'

import { GenerateContext, isPending } from './context'
import { usePlatformsStore } from '@/store/platforms'
import { useUsageStore } from '@/store/usage'

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

/** ย่อรูปหรือดึงเฟรมพร้อมกันกี่ไฟล์ มากกว่านี้แท็บจะหน่วงตอนอัปทีเดียวหลายสิบไฟล์ */
const PROCESS_CONCURRENCY = 3

/** ไฟล์หนึ่งชิ้นที่ต้องอัปขึ้น R2 */
type PendingUpload = { blob: Blob; purpose: UploadPurpose }

/**
 * ไฟล์ที่ประมวลผลเสร็จแล้ว รออัป
 * uploads[0] เป็นรูปย่อเสมอ ที่เหลือคือเฟรมของวิดีโอเรียงตามเวลา
 */
type Processed = { id: string; filename: string; uploads: PendingUpload[] }

/** ชื่อไฟล์ที่แสดงในข้อความเตือน เกินกว่านี้ย่อเป็น "และอีก N ไฟล์" */
const NAMES_IN_NOTICE = 3

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : i18n.t('common.unknownError')
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

  return i18n.t('dropzone.skipped', {
    count: skipped.length,
    names: shown,
    rest: rest > 0 ? i18n.t('dropzone.skippedRest', { count: rest }) : '',
    reasons,
  })
}

export function GenerateProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const activePlatformId = usePlatformsStore((s) => s.activePlatformId)

  // เพดานจำนวนรูปเซิร์ฟเวอร์เป็นเจ้าของ ระหว่างรอคำตอบใช้ค่าสำรองไปก่อน
  const meta = useMeta()
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
      const accepted = files.flatMap((file) => {
        const kind = mediaKindOf(file)
        return kind ? [{ file, kind }] : []
      })

      // นับจาก ref ไม่ใช่ state เผื่อมีชุดก่อนหน้ายังอัปไม่เสร็จ
      const room = Math.max(0, limit - assetsRef.current.length)
      const queued = accepted.slice(0, room).map((item) => ({
        id: crypto.randomUUID(),
        ...item,
      }))

      /**
       * ไฟล์ที่ไม่ได้เข้ารอบนี้ ทยอยเติมระหว่างอัปแล้วอัปเดตข้อความเตือน
       * รูปที่อัปไม่สำเร็จจะถูกถอดออกจากรายการ ไม่ค้างไว้กินโควตา
       * เหลือไว้แต่รูปที่เพิ่มสำเร็จ ที่ว่างจึงเปิดให้เติมรูปใหม่ได้ทันที
       */
      const skipped: Skipped[] = [
        ...files
          .filter((file) => mediaKindOf(file) === null)
          .map((file) => ({
            filename: file.name,
            reason: i18n.t('dropzone.unsupportedType'),
          })),
        ...accepted.slice(room).map(({ file }) => ({
          filename: file.name,
          reason: i18n.t('dropzone.overLimit', { max: limit }),
        })),
      ]

      const drop = (id: string, filename: string, reason: string) => {
        remove(id)
        skipped.push({ filename, reason })
        setNotice(describeSkipped(skipped))
      }

      /** แสดงรูปย่อในการ์ดทันทีที่ได้ ไม่ต้องรอให้อัปเสร็จ */
      const showPreview = (id: string, blob: Blob, details: Partial<Asset>) => {
        const previewUrl = URL.createObjectURL(blob)
        objectUrls.current.set(id, previewUrl)
        patch(id, { previewUrl, ...details })
      }

      setNotice(describeSkipped(skipped))
      if (queued.length === 0) return

      commit((prev) => [
        ...prev,
        ...queued.map(({ id, file, kind }) => ({
          id,
          filename: file.name,
          kind,
          previewUrl: '',
          width: 0,
          height: 0,
          size: file.size,
          status: 'uploading' as const,
          title: '',
          keywords: [],
          category: '',
        })),
      ])

      /**
       * ย่อรูปหรือดึงเฟรมจากวิดีโอก่อน เพื่อให้รู้ว่ามีกี่ไฟล์ที่ต้องอัปตอนขอลิงก์
       * ลำดับใน processed ไม่ตรงกับ queued เพราะไฟล์ไหนเสร็จก่อนก็เข้าก่อน
       */
      const processed: Processed[] = []

      await runWithConcurrency(
        queued.map(({ id, file, kind }) => async () => {
          try {
            if (kind === 'video') {
              const video = await processVideo(file)
              showPreview(id, video.preview, {
                width: video.width,
                height: video.height,
                duration: video.duration,
              })
              processed.push({
                id,
                filename: file.name,
                uploads: [
                  { blob: video.preview, purpose: 'preview' },
                  ...video.frames.map((blob) => ({
                    blob,
                    purpose: 'frame' as const,
                  })),
                ],
              })
            } else {
              const image = await processImage(file)
              showPreview(id, image.blob, {
                width: image.width,
                height: image.height,
              })
              processed.push({
                id,
                filename: file.name,
                uploads: [{ blob: image.blob, purpose: 'preview' }],
              })
            }
          } catch (error) {
            drop(id, file.name, errorMessage(error))
          }
        }),
        PROCESS_CONCURRENCY,
      )

      if (processed.length === 0) return

      // เพดานต่อคำขอของ /uploads/presign คือค่าเดียวกับ maxAssets ที่ /meta บอกมา
      let links: PresignedUpload[]
      try {
        links = await requestUploadUrls(
          processed.flatMap((item) =>
            item.uploads.map(({ blob, purpose }) => ({
              filename: item.filename,
              contentType: blob.type,
              purpose,
            })),
          ),
          limit,
        )
      } catch (error) {
        for (const item of processed) {
          drop(item.id, item.filename, errorMessage(error))
        }
        return
      }

      // เซิร์ฟเวอร์ตอบลิงก์เรียงตามลำดับที่ส่งไป ตัดแบ่งคืนให้แต่ละไฟล์ตามจำนวนที่ขอ
      let cursor = 0
      const assigned = processed.map((item) => {
        const itemLinks = links.slice(cursor, cursor + item.uploads.length)
        cursor += item.uploads.length
        return { item, itemLinks }
      })

      await runWithConcurrency(
        assigned.map(({ item, itemLinks }) => async () => {
          if (itemLinks.length !== item.uploads.length) {
            drop(item.id, item.filename, i18n.t('errors.noUploadUrl'))
            return
          }
          try {
            // ไฟล์ไหนอัปไม่ผ่านสักชิ้น ถือว่าทั้งรูปหรือทั้งคลิปไม่สำเร็จ
            await Promise.all(
              item.uploads.map((upload, index) =>
                uploadToR2(itemLinks[index].url, upload.blob),
              ),
            )
            const [preview, ...frames] = itemLinks
            patch(item.id, {
              status: 'ready',
              previewKey: preview.key,
              frameKeys:
                frames.length > 0 ? frames.map((frame) => frame.key) : undefined,
            })
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

      patch(id, { status: 'generating', waiting: false, error: undefined, notes: undefined })

      const request = {
        previewKey: asset.previewKey,
        filename: asset.filename,
        frameKeys: asset.frameKeys,
        platformIds: [activePlatformId],
      }

      try {
        /*
          Gemini จำกัดอัตรา (เกิน RPM) หรือแน่น เซิร์ฟเวอร์ตอบ 429 และไม่ได้ตัดเครดิต
          รอแล้วส่งใหม่เองจนกว่าจะได้ การ์ดขึ้นว่ารอคิวแทน error
          ช่องของ runWithConcurrency ถูกถือไว้ระหว่างรอ รูปอื่นจึงไม่ส่งไปเบียดเพิ่ม
          ผู้ใช้ลบรูปออกระหว่างรอได้ ถ้าหายไปแล้วก็เลิกส่ง
        */
        let result
        for (let attempt = 1; ; attempt++) {
          try {
            result = await generateMetadata(request)
            break
          } catch (error) {
            if (!isServerBusy(error)) throw error
            patch(id, { waiting: true })
            await sleep(busyRetryDelay(attempt))
            if (!assetsRef.current.some((item) => item.id === id)) return
          }
        }

        patch(id, {
          status: 'generated',
          waiting: false,
          // เซิร์ฟเวอร์รุ่นก่อนหน้าไม่ตอบช่องนี้ ถือว่าใช้แพลตฟอร์มที่ส่งไป
          platformId: result.platform || activePlatformId,
          title: result.title,
          keywords: result.keywords,
          category: result.category,
          translations: result.translations,
          notes: result.notes,
        })

        // นับเฉพาะรูปที่สำเร็จ ให้ตรงกับฝั่งเซิร์ฟเวอร์ซึ่งคืนโควตาให้
        // ทุกครั้งที่สร้างไม่สำเร็จ
        useUsageStore.getState().markUsed(cachedCreditCost('generate'))

        // หน้า History ที่ cache ไว้ยังไม่มีรายการนี้ ให้โหลดใหม่ตอนเปิดครั้งถัดไป
        void queryClient.invalidateQueries({ queryKey: queryKeys.history.all })
      } catch (error) {
        patch(id, { status: 'error', waiting: false, error: errorMessage(error) })

        // 402 = โควตาเดือนนี้หมด รอแล้วลองใหม่ไม่ช่วย ต้องอัปเกรด
        // เปิดป๊อปอัปช่องทางติดต่อให้เลย ไม่ปล่อยให้เห็นแค่ข้อความแดงในการ์ด
        if (error instanceof ApiError && error.status === 402) {
          useUsageStore.getState().reportLimitReached()
        }
      }
    },
    [patch, activePlatformId],
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
