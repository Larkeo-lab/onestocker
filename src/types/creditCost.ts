import type { UserType } from '@/types/profile'
import type { UpscalePreset } from '@/types/upscale'

/** งานที่ใช้เครดิตและแอดมินเปิด/ปิดได้ ต้องตรงกับ CreditFeatures ฝั่ง Go */
export type CreditFeature = 'generate' | 'removeBg' | 'removeBgStandard' | 'upscale'

/**
 * หน้าในแอปที่ซ่อนได้ หน้าลบพื้นหลังเปิดอยู่ถ้ามีสักระดับที่เปิด (มาตรฐานหรือ HD)
 */
export type PageFeature = 'generate' | 'removeBg' | 'upscale'

/**
 * จำนวนเครดิตที่ใช้ต่อหนึ่งครั้งของแต่ละงาน และงานไหนเปิดให้ใช้อยู่
 * แอดมินตั้งได้จากหน้า Settings › ตั้งค่าเครดิต
 *
 * ต้องมีฟิลด์ตรงกับ CreditCosts ใน server/internal/feature/quota/dto.go
 */
export type CreditCosts = {
  /** สร้าง title และ keyword หนึ่งไฟล์ */
  generate: number
  /** ลบพื้นหลังระดับ HD 4K ขึ้นไป (Replicate · Bria + Topaz เมื่อต้นฉบับเล็กกว่า 4K) หนึ่งรูป */
  removeBg: number
  /** ลบพื้นหลังระดับมาตรฐาน (Cloudflare) หนึ่งรูป */
  removeBgStandard: number
  /**
   * อัปสเกลหนึ่งรูปแยกตามขนาด แอดมินตั้งราคาทีละขนาด
   * ไม่มี = เซิร์ฟเวอร์รุ่นก่อนที่มีราคาเดียว ใช้ upscale แทน (ดู lib/creditCosts.ts)
   */
  upscalePresets?: Record<UpscalePreset, number>
  /** ราคาถูกสุดของขนาดที่เปิดอยู่ ใช้เมื่อไม่มี upscalePresets เท่านั้น */
  upscale: number
  /**
   * false = แอดมินปิดงานนั้นอยู่ ซ่อนตัวเลือก เมนู หรือหน้าของงานนั้น
   * upscale = มีสักขนาดที่เปิด upscalePresets = เปิดทีละขนาด
   */
  enabled: Record<CreditFeature, boolean> & { upscalePresets?: Record<UpscalePreset, boolean> }
  /**
   * แพ็กเกจขั้นต่ำของแต่ละงาน key คือชื่องานฝั่ง Go (credits.Action) เช่น remove_bg
   * แพ็กเกจต่ำกว่าเห็นตัวเลือกแต่กดแล้วเปิดป๊อปอัปเลือกแพ็กเกจแทน ไม่มี = เซิร์ฟเวอร์รุ่นก่อน ใช้ได้ทุกแพ็กเกจ
   */
  minUserTypes?: Partial<Record<string, UserType>>
}

export function isPageEnabled(enabled: CreditCosts['enabled'], page: PageFeature): boolean {
  switch (page) {
    case 'removeBg':
      return enabled.removeBg || enabled.removeBgStandard
    case 'upscale':
      return enabled.upscale
    default:
      return enabled.generate
  }
}
