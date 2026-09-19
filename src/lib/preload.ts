import { SIGNED_URL_STALE_MS } from '@/lib/query'

/*
  โหลดรูปไว้ล่วงหน้า กดดูรายละเอียดแล้วขึ้นทันที ไม่ต้องรอโหลดตอนเปิด

  หน้าเว็บส่งไฟล์ดูบนจอ (เล็ก ราว 1 MB) เข้าคิว ไม่ใช่ไฟล์เต็มหลายสิบ MB (ดู usePreloadImages ที่หน้าลบพื้นหลัง)
  ไฟล์เต็มโหลดตอนเปิดดูรูปนั้น

  ลิงก์รูปเป็นลิงก์เซ็นชั่วคราว (อายุ 1 ชั่วโมง) รายการโหลดใหม่เมื่อไร (ทำรูปเสร็จ ลบรูป) ได้ลิงก์ใหม่ทุกรูป
  เบราว์เซอร์เก็บ cache ตามลิงก์ ถ้าจำตามลิงก์จะต้องโหลดทุกรูปใหม่ทุกครั้งที่รายการเปลี่ยน
  จึงจำตาม key (เช่น remove_bg/<id>) พร้อมลิงก์ที่โหลดไว้ หน้าดูรูปใช้ลิงก์นั้นซ้ำ (cachedUrl)
  จนกว่าจะเก่าเกิน SIGNED_URL_STALE_MS (ยังเหลือเวลาก่อนลิงก์หมดอายุ)

  โหลดทีละ PRELOAD_CONCURRENCY รูปตามลำดับบนหน้า ด้วยความสำคัญต่ำ รูปย่อและคำขออื่นของหน้าได้ไปก่อน
  เน็ตช้าหรือเปิดโหมดประหยัดข้อมูลไว้ไม่โหลดล่วงหน้า

  เปิดดูรูปไหน รูปนั้นได้เน็ตทั้งหมดก่อน (holdPreload):
    - ไฟล์ของรูปนั้นที่กำลังโหลดอยู่โหลดต่อ หน้าดูรูปใช้ลิงก์เดียวกัน เบราว์เซอร์ต่อจากที่โหลดค้าง ไม่เริ่มใหม่
    - รูปอื่นที่กำลังโหลดถูกยกเลิกแล้วกลับไปต้นคิว คิวหยุดรอ
    - หน้าดูรูปโหลดเสร็จ (หรือปิด) ปล่อยคิวให้ทำต่อ
*/

export type PreloadItem = { key: string; url: string }

const PRELOAD_CONCURRENCY = 2

type Entry = { url: string; seenAt: number }
type Flight = Entry & { image: HTMLImageElement }

const loaded = new Map<string, Entry>()
const inFlight = new Map<string, Flight>()
let queue: (PreloadItem & { seenAt: number })[] = []
// จำนวนหน้าดูรูปที่กำลังโหลดอยู่ มากกว่า 0 = คิวหยุด
let holds = 0

function fresh(entry: Entry | undefined): entry is Entry {
  return entry !== undefined && Date.now() - entry.seenAt < SIGNED_URL_STALE_MS
}

/**
 * ลิงก์ที่ควรใช้โหลดไฟล์ของ key นี้
 * โหลดเสร็จแล้วหรือกำลังโหลดอยู่ใช้ลิงก์นั้น (อยู่ใน cache หรือต่อจากที่ค้าง) ไม่งั้นใช้ url ที่ส่งมา
 */
export function cachedUrl(key: string, url: string | null): string | null {
  const done = loaded.get(key)
  if (fresh(done)) return done.url
  return inFlight.get(key)?.url ?? url
}

/** ลิงก์นี้โหลดเสร็จแล้วหรือยัง หน้าดูรูปใช้ตัดสินว่าแสดงได้ทันทีไหม */
export function isPreloaded(url: string): boolean {
  for (const entry of loaded.values()) {
    if (entry.url === url) return fresh(entry)
  }
  return false
}

/** หน้าดูรูปโหลดไฟล์เองสำเร็จ จำไว้ด้วย เปิดรูปเดิมซ้ำจะได้ไม่ต้องรอ */
export function markPreloaded(key: string, url: string) {
  loaded.set(key, { url, seenAt: Date.now() })
}

/**
 * หยุดคิวให้หน้าดูรูปได้เน็ตทั้งหมด ไฟล์ของ keep ที่กำลังโหลดอยู่โหลดต่อ ไฟล์อื่นที่กำลังโหลดถูกยกเลิกกลับไปต้นคิว
 * คืนฟังก์ชันปล่อยคิว เรียกซ้ำได้ (ครั้งที่สองไม่มีผล)
 */
export function holdPreload(keep: string[]): () => void {
  holds += 1
  const kept = new Set(keep)
  // ไฟล์ของรูปที่เปิดดู หน้าดูรูปโหลดเอง ไม่ต้องรอคิว
  queue = queue.filter((item) => !kept.has(item.key))
  const canceled: typeof queue = []
  for (const [key, flight] of inFlight) {
    if (kept.has(key)) continue
    flight.image.onload = null
    flight.image.onerror = null
    // เปลี่ยน src = ยกเลิกคำขอเดิม เน็ตไปที่รูปที่เปิดดูแทน
    flight.image.src = ''
    inFlight.delete(key)
    canceled.push({ key, url: flight.url, seenAt: flight.seenAt })
  }
  queue = [...canceled, ...queue]

  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    pump()
  }
}

// เน็ตช้าหรือผู้ใช้ขอประหยัดข้อมูล โหลดรูปล่วงหน้าจะแย่งเน็ตจนหน้าช้า
function shouldSkip(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection
  return Boolean(connection?.saveData) || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
}

/**
 * จัดคิวใหม่: items (ลำดับบนหน้า) ขึ้นก่อน คิวของหน้าอื่นที่ยังเปิดอยู่ต่อท้าย คืนฟังก์ชันเอา items ออกจากคิว
 * ตัวที่กำลังโหลดอยู่โหลดต่อจนจบ
 */
export function enqueuePreload(items: PreloadItem[]): () => void {
  if (items.length === 0 || shouldSkip()) return () => {}
  const now = Date.now()
  const keys = new Set(items.map((item) => item.key))
  queue = [
    ...items
      .filter((item) => !fresh(loaded.get(item.key)) && !inFlight.has(item.key))
      .map((item) => ({ ...item, seenAt: now })),
    ...queue.filter((item) => !keys.has(item.key)),
  ]
  pump()
  return () => {
    queue = queue.filter((item) => !keys.has(item.key))
  }
}

function pump() {
  // หน้าดูรูปกำลังโหลดอยู่ ไม่เริ่มตัวใหม่ให้แย่งเน็ต
  if (holds > 0) return
  while (inFlight.size < PRELOAD_CONCURRENCY && queue.length > 0) {
    const item = queue.shift()!
    if (fresh(loaded.get(item.key)) || inFlight.has(item.key)) continue
    const image = new Image()
    const flight = { url: item.url, seenAt: item.seenAt, image }
    inFlight.set(item.key, flight)
    image.fetchPriority = 'low'
    image.decoding = 'async'
    image.onload = () => {
      inFlight.delete(item.key)
      loaded.set(item.key, { url: flight.url, seenAt: flight.seenAt })
      pump()
    }
    image.onerror = () => {
      inFlight.delete(item.key)
      pump()
    }
    image.src = item.url
  }
}
