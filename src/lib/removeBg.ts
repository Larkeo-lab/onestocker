import { intlLocale } from '@/config/i18n'
import type { CreditCosts } from '@/types/creditCost'
import { QUALITY_FEATURE, type RemoveBgQuality } from '@/types/removeBg'

/** ต้องตรงกับ MaxUploadBytes ใน server/internal/feature/removebg/validation.go */
export const MAX_UPLOAD_MB = 40

/** ต้องตรงกับ uploadExtensions ใน server/internal/feature/removebg/validation.go */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * ลบพื้นหลังพร้อมกันกี่รูปจากแท็บเดียว
 *
 * เซิร์ฟเวอร์รับพร้อมกันได้ 3 รูปทั้งระบบ ถ้าแท็บเดียวยิงหมด ลูกค้าคนอื่นจะต้องรอคิว
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
export function enabledQualities(costs: CreditCosts): RemoveBgQuality[] {
  return (['standard', 'hd'] as const).filter((quality) => costs.enabled[QUALITY_FEATURE[quality]])
}
