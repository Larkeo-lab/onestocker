import { queryClient, queryKeys } from '@/lib/query'
import type { CreditCosts, CreditFeature } from '@/types/creditCost'
import type { UpscalePreset } from '@/types/upscale'

/**
 * ราคาของงานจาก cache สำหรับโค้ดนอกคอมโพเนนต์ (store) ที่เรียก hook ไม่ได้
 *
 * ใช้แค่บวกตัวเลขเครดิตบน header ให้ขยับทันทีระหว่างรอยอดจริง ยังไม่มีใน cache ใช้ 1
 * ค่าที่ผิดจะถูกทับด้วยยอดจริงจากเซิร์ฟเวอร์ในไม่กี่วินาที (ดู markUsed ใน store/usage.ts)
 */
export function cachedCreditCost(action: CreditFeature): number {
  return cachedCreditCosts()?.[action] ?? 1
}

/** ราคาทั้งชุดจาก cache สำหรับโค้ดนอกคอมโพเนนต์ ยังไม่มีได้ undefined */
export function cachedCreditCosts(): CreditCosts | undefined {
  return queryClient.getQueryData<CreditCosts>(queryKeys.creditCosts)
}

/** เครดิตต่อรูปของการอัปสเกลขนาดนั้น เซิร์ฟเวอร์รุ่นก่อนมีราคาเดียวทุกขนาด ใช้ราคานั้นแทน */
export function upscaleCost(costs: CreditCosts | undefined, preset: UpscalePreset): number | undefined {
  if (!costs) return undefined
  return costs.upscalePresets?.[preset] ?? costs.upscale
}

/**
 * แอดมินเปิดขนาดนั้นให้ใช้ไหม ยังไม่รู้ราคาให้ถือว่าเปิด เซิร์ฟเวอร์ตรวจซ้ำตอนสั่งอยู่แล้ว
 * (ปกติรู้เสมอ หน้าอัปสเกลรอราคาโหลดก่อนถึงจะแสดง)
 */
export function upscalePresetEnabled(costs: CreditCosts | undefined, preset: UpscalePreset): boolean {
  if (!costs) return true
  return costs.enabled.upscalePresets?.[preset] ?? costs.enabled.upscale
}
