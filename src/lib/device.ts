/*
  รหัสของเครื่องที่ใช้เปิดแอป ส่งไปกับทุกคำขอเป็น header (ดู api/client.ts)

  เครดิตฟรีเป็นก้อนเดียวตลอดชีพ คนที่ใช้หมดแล้วจึงสมัครอีเมลใหม่เพื่อเอาเครดิตรอบใหม่
  เซิร์ฟเวอร์เก็บคู่ (เครื่อง, บัญชี) ไว้ให้แอดมินเห็นว่าบัญชีไหนมาจากเครื่องเดียวกัน
  (ดู server/internal/shared/database/migrations/0031_device_accounts.sql)

  ไม่ใช่การระบุตัวตน และไม่ได้กันใครออกจากระบบ — หลบได้ง่ายทั้งสองค่า
  ล้างข้อมูลเว็บ เปลี่ยนเบราว์เซอร์ หรือเปลี่ยนเครื่องก็กลายเป็นเครื่องใหม่ทันที
  ของแบบนี้ใช้เป็นสัญญาณให้คนไปดูต่อ ไม่ใช่หลักฐานที่เอาไปตัดสินอัตโนมัติ
*/

/** key ใน localStorage ที่จำรหัสเครื่องไว้ เปลี่ยนชื่อเมื่อไรทุกคนจะกลายเป็นเครื่องใหม่หมด */
const DEVICE_STORAGE_KEY = 'one-stock.device-id'

/** คำนวณครั้งเดียวต่อการเปิดหน้า ค่าไม่เปลี่ยนระหว่างใช้งานอยู่แล้ว */
let cachedID: string | undefined
let cachedSignature: string | undefined

/**
 * รหัสเครื่องที่สุ่มครั้งแรกแล้วจำไว้
 *
 * ค่านี้ไม่มีความหมายในตัวเอง เป็นแค่เลขสุ่มที่อยู่กับเบราว์เซอร์นั้น
 * ไม่ได้ผูกกับบัญชี คนละบัญชีบนเครื่องเดียวกันจึงได้ค่าเดียวกัน ซึ่งคือสิ่งที่ต้องการ
 */
export function deviceID(): string {
  if (cachedID === undefined) cachedID = loadOrCreateID()
  return cachedID
}

function loadOrCreateID(): string {
  const saved = readStored()
  if (saved) return saved

  const created = randomID()
  if (writeStored(created)) return created

  /*
    เก็บลงเครื่องไม่ได้ (โหมดส่วนตัวของ Safari หรือปิดการเก็บข้อมูลเว็บ)

    ถ้ายังใช้เลขสุ่มต่อ ทุกครั้งที่เปิดแอปจะกลายเป็นเครื่องใหม่ ฐานข้อมูลจะเต็มไปด้วย
    แถวที่ใช้นับอะไรไม่ได้เลย ใช้ลายนิ้วมือเป็นรหัสแทน ซึ่งเท่าเดิมทุกครั้งที่เปิด
  */
  return `fp-${deviceSignature()}`
}

/**
 * ลายนิ้วมือของเครื่อง — ใช้ตอน localStorage ถูกล้าง
 *
 * ประกอบจากสิ่งที่เบราว์เซอร์บอกโดยไม่ต้องขออนุญาต และไม่เปลี่ยนตามเวอร์ชันของเบราว์เซอร์
 * (ไม่ใช้ user agent ทั้งก้อน ไม่งั้นค่าจะเปลี่ยนทุกครั้งที่อัปเดตเบราว์เซอร์)
 *
 * ซ้ำกันได้ง่ายระหว่างเครื่องรุ่นเดียวกันที่ตั้งค่าเหมือนกัน โดยเฉพาะ iPhone และ iPad
 * ที่ตั้งใจทำให้ทุกเครื่องดูเหมือนกันเพื่อกันการถูกติดตาม ฝั่งเซิร์ฟเวอร์จึงแยกเก็บ
 * คนละช่องกับรหัสเครื่อง ไม่เอามานับรวมกัน
 */
export function deviceSignature(): string {
  if (cachedSignature === undefined) {
    cachedSignature = hash64(signals().join('|'))
  }
  return cachedSignature
}

function signals(): string[] {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return [
    platformName(nav.userAgent),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(window.devicePixelRatio),
    timeZone(),
    nav.language,
    String(nav.hardwareConcurrency ?? ''),
    String(nav.deviceMemory ?? ''),
    String(nav.maxTouchPoints ?? ''),
    graphicsCard(),
  ]
}

/*
  เอาแค่ชื่อระบบจาก user agent ไม่เอาเลขเวอร์ชัน

  iPad ที่เปิดแบบ desktop บอกว่าเป็น Macintosh แยกออกจาก Mac จริงด้วย maxTouchPoints
  ซึ่งอยู่ในชุดสัญญาณด้วยอยู่แล้ว
*/
const PLATFORMS = ['iPhone', 'iPad', 'Macintosh', 'Android', 'Windows', 'Linux']

function platformName(userAgent: string): string {
  return PLATFORMS.find((name) => userAgent.includes(name)) ?? 'unknown'
}

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return ''
  }
}

/*
  ชื่อชิปกราฟิก เป็นสัญญาณที่แยกเครื่องได้ดีที่สุดในชุดนี้

  Safari รุ่นใหม่ไม่บอกแล้ว และเครื่องที่ปิด WebGL ก็ไม่มีค่า ได้ค่าว่างไม่เป็นไร
  สัญญาณตัวอื่นยังทำงานต่อได้
*/
function graphicsCard(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    if (!gl || !info) return ''
    return String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '')
  } catch {
    return ''
  }
}

/*
  FNV-1a สองชุดด้วยตัวคูณต่างกัน ต่อกันเป็น 64 บิต

  ไม่ใช่ hash เชิงรหัสลับ และไม่ต้องเป็น — หน้าที่เดียวของมันคือย่อสัญญาณชุดหนึ่ง
  ให้เป็นข้อความสั้น ๆ ที่เท่ากันทุกครั้งถ้าสัญญาณเหมือนเดิม
  (ใช้ของตัวเองแทนไลบรารีลายนิ้วมือ เพราะตัวที่ดังที่สุดไม่ได้ให้ใช้ฟรีเชิงพาณิชย์แล้ว)
*/
function hash64(text: string): string {
  let low = 0x811c9dc5
  let high = 0xc59d1c81
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    low = Math.imul(low ^ code, 0x01000193)
    high = Math.imul(high ^ code, 0x85ebca6b)
  }
  return hex(low) + hex(high)
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0')
}

function randomID(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // ไม่ใช่ https (เปิดจาก IP ในวง LAN ตอนทดสอบ) crypto.randomUUID ใช้ไม่ได้
    return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}

/** localStorage อ่านหรือเขียนไม่ได้ในบางโหมด (private, ปิด cookie) จึงห่อ try ไว้ทั้งคู่ */
function readStored(): string {
  try {
    return window.localStorage.getItem(DEVICE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStored(value: string): boolean {
  try {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, value)
    return true
  } catch {
    return false
  }
}
