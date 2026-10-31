import { queryClient, queryKeys } from '@/lib/query'
import { effectiveOptions, type VideoChoice } from '@/lib/videoFormats'
import type { AnimationCreditAction, CreditCosts, CreditFeature } from '@/types/creditCost'
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

const FORMAT_ACTIONS: Record<VideoChoice['format'], AnimationCreditAction> = {
  mp4: 'animation_mp4',
  prores: 'animation_prores',
  prores_alpha: 'animation_prores_alpha',
}

/**
 * รายการเครดิตของไฟล์แอนิเมชันแบบที่เลือก ต้องตรงกับ videoSpec.creditActions ใน server/internal/feature/animation/spec.go
 * ราคาตั้งต้นของชนิดไฟล์ + ส่วนเพิ่มของความละเอียด คุณภาพ 120 fps และทุก 10 วินาทีที่ยาวเกิน 10 วินาที
 * seconds = ความยาวไฟล์จริง (ดู lengthFor)
 */
export function videoChoiceActions(choice: VideoChoice, seconds: number): AnimationCreditAction[] {
  const { resolution, quality } = effectiveOptions(choice)
  const actions: AnimationCreditAction[] = [FORMAT_ACTIONS[choice.format]]
  if (resolution === 1440) actions.push('animation_1440')
  if (resolution === 2160) actions.push('animation_2160')
  if (quality === 'max') actions.push('animation_quality_max')
  if (quality === 'lossless') actions.push('animation_quality_lossless')
  if (choice.fps === 120) actions.push('animation_fps_120')
  // 11–20 วินาที = 1 ครั้ง 21–30 = 2 ครั้ง
  for (let extra = Math.floor((seconds - 1) / 10); extra > 0; extra--) actions.push('animation_extra_10s')
  return actions
}

/** ยอดรวมของรายการ ยังไม่รู้ราคา (เซิร์ฟเวอร์รุ่นก่อนหรือ cache ยังไม่มา) ได้ undefined */
export function animationCost(costs: CreditCosts | undefined, actions: AnimationCreditAction[]): number | undefined {
  if (!costs?.animation) return undefined
  let total = 0
  for (const action of actions) {
    const cost = costs.animation[action]
    if (cost === undefined) return undefined
    total += cost
  }
  return total
}

/** แอดมินเปิดรายการนั้นไหม ยังไม่รู้ให้ถือว่าเปิด เซิร์ฟเวอร์ตรวจซ้ำตอนสั่งอยู่แล้ว */
export function animationActionEnabled(costs: CreditCosts | undefined, action: AnimationCreditAction): boolean {
  return costs?.enabled.animation?.[action] ?? true
}
