/**
 * ดึงภาพนิ่งจากวิดีโอในเบราว์เซอร์ แทนการอัปวิดีโอขึ้นคลาวด์
 *
 * เหตุผล: วิดีโอสต็อกหนักหลายร้อย MB ต่อคลิป แต่การเขียน title กับคีย์เวิร์ด
 * ต้องการแค่เห็นว่าในคลิปมีอะไรและเกิดอะไรขึ้น ภาพนิ่งไม่กี่เฟรมจึงพอ
 * ตัววิดีโอไม่เคยออกจากเครื่องผู้ใช้ เหมือนที่รูปต้นฉบับไม่เคยออก
 *
 * เบราว์เซอร์อ่านไฟล์จากดิสก์ทีละส่วนตอน seek ไม่ได้โหลดทั้งไฟล์เข้าหน่วยความจำ
 */
import i18n from '@/config/i18n'
import { drawToBlob, PREVIEW_CONTENT_TYPE, PREVIEW_MAX_EDGE } from '@/lib/image'

/** ความยาวสูงสุดที่รับ */
export const VIDEO_MAX_SECONDS = 60

/**
 * ไฟล์ที่ตัดมา 60 วินาทีพอดี ความยาวในไฟล์มักเกินมาเศษเสี้ยววินาที
 * (เช่น 60.03) ถ้าเทียบตรง ๆ คลิปที่ถูกต้องจะโดนปฏิเสธ
 */
const DURATION_TOLERANCE_SECONDS = 0.5

/**
 * จำนวนเฟรมที่ส่งให้โมเดลดู ต้องไม่เกิน VideoFramesMax ฝั่งเซิร์ฟเวอร์
 *
 * ทุกเฟรมคิดเป็น token ของโมเดล มากขึ้นก็แพงขึ้น
 * คลิปสต็อกส่วนใหญ่เป็นช็อตเดียว 6 เฟรมเห็นทั้งการเคลื่อนไหวและฉากครบแล้ว
 */
const FRAME_COUNT = 6

/** เล็กกว่ารูปย่อ เพราะส่งทีละหลายเฟรม ถ้าใหญ่เท่ารูปย่อค่า token จะคูณตามจำนวนเฟรม */
const FRAME_MAX_EDGE = 1024

/** รอ seek ได้นานสุดเท่านี้ ไฟล์เสียบางแบบไม่ตอบทั้ง seeked และ error ทำให้ค้างตลอดไป */
const SEEK_TIMEOUT_MS = 15_000

export type ProcessedVideo = {
  /** เฟรมกลางคลิปขนาดเท่ารูปย่อ ใช้แสดงในการ์ดและหน้า History */
  preview: Blob
  /** เฟรมที่ส่งให้โมเดล เรียงตามเวลา */
  frames: Blob[]
  contentType: string
  /** ขนาดจริงของวิดีโอต้นฉบับ */
  width: number
  height: number
  /** ความยาวเป็นวินาที */
  duration: number
}

function waitForEvent(
  video: HTMLVideoElement,
  event: 'loadedmetadata' | 'seeked',
  failure: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(failure))
    }, SEEK_TIMEOUT_MS)

    const onDone = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(failure))
    }
    const cleanup = () => {
      clearTimeout(timer)
      video.removeEventListener(event, onDone)
      video.removeEventListener('error', onError)
    }

    video.addEventListener(event, onDone)
    video.addEventListener('error', onError)
  })
}

/**
 * ตำแหน่งเวลาของแต่ละเฟรม เว้นหัวและท้ายคลิปไว้ครึ่งช่วง
 *
 * เฟรมแรกสุดกับท้ายสุดมักเป็นจอดำหรือกำลัง fade จึงไม่เอาตรงขอบพอดี
 * เช่นคลิป 12 วินาที 6 เฟรม ได้วินาทีที่ 1, 3, 5, 7, 9, 11
 */
function frameTimes(duration: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * duration)
}

export async function processVideo(file: File): Promise<ProcessedVideo> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  try {
    const loaded = waitForEvent(
      video,
      'loadedmetadata',
      i18n.t('errors.videoUnreadable'),
    )
    video.src = url
    await loaded

    const { duration, videoWidth, videoHeight } = video

    // ขนาด 0 = เบราว์เซอร์อ่านได้แค่เสียง ไม่รู้จัก codec ภาพ (เช่น ProRes บน Chrome)
    // ความยาวไม่จำกัด = ไฟล์ไม่บอกความยาวไว้ หาตำแหน่งเฟรมไม่ได้
    if (videoWidth === 0 || videoHeight === 0 || !Number.isFinite(duration)) {
      throw new Error(i18n.t('errors.videoUnreadable'))
    }
    if (duration > VIDEO_MAX_SECONDS + DURATION_TOLERANCE_SECONDS) {
      throw new Error(
        i18n.t('errors.videoTooLong', { max: VIDEO_MAX_SECONDS }),
      )
    }

    const times = frameTimes(duration, FRAME_COUNT)
    const previewIndex = Math.floor(FRAME_COUNT / 2)
    const frames: Blob[] = []
    let preview: Blob | undefined

    // seek ทีละเฟรมตามลำดับ วิดีโอหนึ่งตัวอยู่ได้ทีละตำแหน่งเท่านั้น
    for (const [index, time] of times.entries()) {
      const seeked = waitForEvent(
        video,
        'seeked',
        i18n.t('errors.videoFrameFailed'),
      )
      video.currentTime = time
      await seeked

      frames.push(
        await drawToBlob(video, videoWidth, videoHeight, FRAME_MAX_EDGE),
      )
      if (index === previewIndex) {
        preview = await drawToBlob(
          video,
          videoWidth,
          videoHeight,
          PREVIEW_MAX_EDGE,
        )
      }
    }

    if (!preview) {
      throw new Error(i18n.t('errors.videoFrameFailed'))
    }

    return {
      preview,
      frames,
      contentType: PREVIEW_CONTENT_TYPE,
      width: videoWidth,
      height: videoHeight,
      duration,
    }
  } finally {
    // ปล่อยตัวถอดรหัสวิดีโอทันที ไม่รอ garbage collector
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
