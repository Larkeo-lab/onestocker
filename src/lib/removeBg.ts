import { intlLocale } from '@/config/i18n'
import { HEIC_ACCEPT } from '@/lib/heic'
import { planAtLeast } from '@/lib/plans'
import type { CreditCosts } from '@/types/creditCost'
import type { UserType } from '@/types/profile'
import type { DisplayFiles } from '@/components/library/ImageViewer'
import type { PreloadItem } from '@/lib/preload'
import { QUALITY_FEATURE, type BackgroundRemoval, type RemoveBgQuality } from '@/types/removeBg'

/** ต้องตรงกับ MaxUploadBytes ใน server/internal/feature/removebg/validation.go */
export const MAX_UPLOAD_MB = 40

/** ต้องตรงกับ uploadExtensions ใน server/internal/feature/removebg/validation.go */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** ช่องเลือกไฟล์รับ HEIC ด้วย ซึ่งถูกแปลงเป็น JPEG ก่อนอัป (ดู lib/heic.ts) */
export const PICKER_ACCEPT = [...ACCEPTED_TYPES, ...HEIC_ACCEPT].join(',')

/**
 * ลบพื้นหลังพร้อมกันกี่รูปจากแท็บเดียว
 *
 * เซิร์ฟเวอร์จำกัดงานพร้อมกันทั้งระบบตามขนาดรูป ถ้าแท็บเดียวยิงหมด ลูกค้าคนอื่นจะต้องรอคิว
 * สองรูปพอให้ไม่รู้สึกว่าช้า และการอัปไฟล์ใหญ่พร้อมกันหลายไฟล์ก็กินเน็ตจนช้าลงทุกไฟล์อยู่ดี
 */
export const REMOVE_BG_CONCURRENCY = 2

/**
 * อัปต้นฉบับพร้อมกันกี่ไฟล์ ไฟล์ใหญ่ได้ถึง 40 MB
 * อัปพร้อมกันมากกว่านี้เน็ตบ้านไม่ได้เร็วขึ้น แต่ทุกไฟล์ช้าลงเท่ากันหมด และเสร็จช้ากว่าทยอยทีละน้อย
 */
export const REMOVE_BG_UPLOAD_CONCURRENCY = 2

/**
 * ปุ่มดาวน์โหลดเป็นลิงก์ หน้าตาเหมือน Button แบบ primary ขนาด sm
 * ไม่ต้องมี download attribute เซิร์ฟเวอร์เซ็นลิงก์ให้บันทึกเป็นไฟล์อยู่แล้ว (ข้ามโดเมนแล้ว attribute นั้นใช้ไม่ได้)
 */
export const DOWNLOAD_LINK_CLASS =
  'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent bg-primary px-2.5 text-[13px] font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover'

/** 1536 → "1.5 KB", 5_300_000 → "5.1 MB" */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${value.toLocaleString(intlLocale(), { maximumFractionDigits: digits })} ${units[unit]}`
}

/**
 * พื้นลายตารางหมากรุกไว้ใต้รูป PNG ให้เห็นว่าส่วนไหนโปร่งใส
 * ใช้เป็น style ตรง ๆ เพราะ Tailwind ไม่มี utility ของลายนี้
 */
export const CHECKERBOARD_STYLE = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
} as const

/** ระดับคุณภาพที่แอดมินเปิดอยู่ เรียงจากประหยัดไปละเอียด ตัวแรกคือค่าที่เลือกไว้ให้ก่อน */
/** ชื่องานฝั่ง Go ของแต่ละระดับ ต้องตรงกับ credits.ActionRemoveBg* */
const QUALITY_ACTION: Record<RemoveBgQuality, string> = {
  standard: 'remove_bg_standard',
  hd: 'remove_bg',
}

/** แพ็กเกจขั้นต่ำของระดับนั้น null = ทุกแพ็กเกจใช้ได้ */
export function requiredPlan(costs: CreditCosts, quality: RemoveBgQuality): UserType | null {
  const plan = costs.minUserTypes?.[QUALITY_ACTION[quality]]
  return plan && plan !== 'FREE' ? plan : null
}

/**
 * แพ็กเกจของผู้ใช้ยังไม่ถึงระดับนั้น ยังไม่รู้แพ็กเกจ (usage ยังไม่มา) ถือว่าใช้ได้ เซิร์ฟเวอร์ตรวจซ้ำอยู่แล้ว
 */
export function qualityLocked(costs: CreditCosts, quality: RemoveBgQuality, userType: UserType | undefined): boolean {
  const plan = requiredPlan(costs, quality)
  return plan !== null && userType !== undefined && !planAtLeast(userType, plan)
}

export function enabledQualities(costs: CreditCosts): RemoveBgQuality[] {
  return (['standard', 'hd'] as const).filter((quality) => costs.enabled[QUALITY_FEATURE[quality]])
}

/** key ของผลลัพธ์ใน lib/preload และ id ของหน้าดูรูป การ์ดของรอบนี้กับการ์ดในประวัติใช้ร่วมกัน */
export function resultViewKey(result: BackgroundRemoval): string {
  return `remove_bg/${result.id}`
}

/** ไฟล์ขนาดดูบนจอของผลลัพธ์ null = ไม่มี (ผลลัพธ์เล็ก หรือรายการเก่า) หน้าดูรูปใช้ไฟล์เต็ม */
export function displayFiles(result: BackgroundRemoval): DisplayFiles | null {
  return result.displayUrl ? { url: result.displayUrl, maskUrl: result.displayMaskUrl ?? null } : null
}

/**
 * ไฟล์ที่ต้องโหลดไว้ล่วงหน้าของผลลัพธ์ (ดู lib/preload)
 * มีไฟล์ดูบนจอโหลดแค่ไฟล์นั้น (ราว 1 MB) ไฟล์เต็มโหลดตอนเปิดดู ไม่มีก็โหลดไฟล์เต็ม
 */
export function preloadFiles(result: BackgroundRemoval): PreloadItem[] {
  const key = resultViewKey(result)
  if (result.displayUrl) {
    return [
      { key, url: result.displayUrl },
      ...(result.displayMaskUrl ? [{ key: `${key}#mask`, url: result.displayMaskUrl }] : []),
    ]
  }
  return result.url ? [{ key, url: result.url }] : []
}
