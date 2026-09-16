/** งานที่ใช้เครดิตและแอดมินเปิด/ปิดได้ ต้องตรงกับ CreditFeatures ฝั่ง Go */
export type CreditFeature = 'generate' | 'removeBg' | 'removeBgStandard'

/**
 * หน้าในแอปที่ซ่อนได้ หน้าลบพื้นหลังเปิดอยู่ถ้ามีสักระดับที่เปิด (มาตรฐานหรือ HD)
 */
export type PageFeature = 'generate' | 'removeBg'

/**
 * จำนวนเครดิตที่ใช้ต่อหนึ่งครั้งของแต่ละงาน และงานไหนเปิดให้ใช้อยู่
 * แอดมินตั้งได้จากหน้า Settings › ตั้งค่าเครดิต
 *
 * ต้องมีฟิลด์ตรงกับ CreditCosts ใน server/internal/feature/quota/dto.go
 */
export type CreditCosts = {
  /** สร้าง title และ keyword หนึ่งไฟล์ */
  generate: number
  /** ลบพื้นหลังระดับ HD (Photoroom) หนึ่งรูป */
  removeBg: number
  /** ลบพื้นหลังระดับมาตรฐาน (Cloudflare) หนึ่งรูป */
  removeBgStandard: number
  /** false = แอดมินปิดงานนั้นอยู่ ซ่อนตัวเลือก เมนู หรือหน้าของงานนั้น */
  enabled: Record<CreditFeature, boolean>
}

export function isPageEnabled(enabled: CreditCosts['enabled'], page: PageFeature): boolean {
  return page === 'removeBg' ? enabled.removeBg || enabled.removeBgStandard : enabled.generate
}
