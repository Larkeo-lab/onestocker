import i18n from '@/config/i18n'
import { upscaleCost, upscalePresetEnabled } from '@/lib/creditCosts'
import { HEIC_ACCEPT } from '@/lib/heic'
import { planAtLeast } from '@/lib/plans'
import type { CreditCosts } from '@/types/creditCost'
import { USER_TYPES, type UserType } from '@/types/profile'
import type { UpscalePreset } from '@/types/upscale'

/**
 * ต้องตรงกับ MaxInputBytes ใน server/internal/feature/upscale/validation.go
 * พอให้รูปลบพื้นหลัง Pro จากคลัง (PNG 4K ราว 20–30 MB) อัปสเกลต่อได้
 */
export const MAX_INPUT_MB = 80

/** ต้องตรงกับ uploadExtensions ใน server/internal/feature/upscale/validation.go */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** ช่องเลือกไฟล์รับ HEIC ด้วย ซึ่งถูกแปลงเป็น JPEG ก่อนวัดขนาดและอัป (ดู lib/heic.ts) */
export const PICKER_ACCEPT = [...ACCEPTED_TYPES, ...HEIC_ACCEPT].join(',')

/**
 * ตัวคูณที่ Topaz (AI ที่ใช้ขยาย) รับ ต้องตรงกับ topazFactors ใน server/internal/feature/upscale/replicate.go
 * ขยายได้ไม่เกิน 6 เท่า รูปเล็กมากจึงเลือกขนาดใหญ่ ๆ ไม่ได้
 */
const TOPAZ_FACTORS = [2, 4, 6]
export const MAX_FACTOR = TOPAZ_FACTORS[TOPAZ_FACTORS.length - 1]

/** อัปสเกลพร้อมกันกี่รูปจากแท็บเดียว เซิร์ฟเวอร์รับพร้อมกันได้ 2 รูปทั้งระบบ */
export const UPSCALE_CONCURRENCY = 1
/** อัปต้นฉบับพร้อมกันกี่ไฟล์ */
export const UPSCALE_UPLOAD_CONCURRENCY = 2
/** อัปต้นฉบับหนึ่งไฟล์ได้กี่รอบเมื่อเน็ตสะดุดกลางทาง ก่อนขึ้น error ให้กดลองใหม่เอง */
export const UPLOAD_ATTEMPTS = 3

/**
 * ระดับที่ให้เลือก ชื่อตามมาตรฐานวิดีโอ ขนาดยึดด้านยาวเพราะรูปมีทุกสัดส่วน
 * ต้องตรงกับ presetLongSide ใน server/internal/feature/upscale/dto.go
 */
export const PRESETS: { id: UpscalePreset; label: string; short: string; longSide: number }[] = [
  { id: 'fhd', label: 'Full HD (1080p)', short: 'Full HD', longSide: 1920 },
  { id: 'qhd', label: '2K / QHD (1440p)', short: '2K', longSide: 2560 },
  { id: 'uhd', label: '4K / UHD (2160p)', short: '4K', longSide: 3840 },
  { id: 'fuhd', label: '8K / FUHD (4320p)', short: '8K', longSide: 7680 },
]

export type PresetOption = {
  preset: UpscalePreset
  label: string
  width: number
  height: number
  /** ล้านพิกเซล ปัดหนึ่งตำแหน่ง */
  megapixels: number
  /** ขยายกี่เท่าของด้านยาว */
  factor: number
  /**
   * notLarger = รูปใหญ่เท่านี้อยู่แล้ว, tooSmall = ต้องขยายเกิน 6 เท่า, off = แอดมินปิดขนาดนี้,
   * plan = แพ็กเกจของลูกค้ายังไม่ถึง (ดู plan)
   */
  unavailable: 'notLarger' | 'tooSmall' | 'off' | 'plan' | null
  /** แพ็กเกจขั้นต่ำของขนาดนี้ null = ทุกแพ็กเกจใช้ได้ */
  plan: UserType | null
  /** เครดิตต่อรูปของขนาดนี้ undefined = ยังไม่รู้ราคา */
  credits: number | undefined
}

/**
 * ขยายถึงด้านยาวเป้าหมายด้วย Topaz ได้ไหม (ตัวคูณสูงสุด 6 เท่า)
 * ต้องตรงกับ topazPlan ใน server/internal/feature/upscale/validation.go
 * เซิร์ฟเวอร์ย่อต้นฉบับก่อนให้ขยายแล้วได้ขนาดพอดี ตัวคูณจริงจึงไม่ต้องแสดง
 */
function reachable(sourceLong: number, targetLong: number): boolean {
  return TOPAZ_FACTORS.some((factor) => sourceLong * factor >= targetLong)
}

/**
 * ขนาดผลลัพธ์ คงสัดส่วนเดิม ด้านยาวเท่ากับของระดับนั้นพอดี
 * ต้องตรงกับ targetSize ใน server/internal/feature/upscale/validation.go ตัวเลขที่ลูกค้าเห็นจะได้ตรงกับที่ได้จริง
 */
export function targetSize(width: number, height: number, longSide: number): { width: number; height: number } {
  const scale = longSide / Math.max(width, height)
  return width >= height
    ? { width: longSide, height: Math.max(1, Math.round(height * scale)) }
    : { width: Math.max(1, Math.round(width * scale)), height: longSide }
}

/** ชื่องานฝั่ง Go ของแต่ละขนาด ต้องตรงกับ credits.UpscaleActions */
const PRESET_ACTION: Record<UpscalePreset, string> = {
  fhd: 'upscale_fhd',
  qhd: 'upscale_qhd',
  uhd: 'upscale_uhd',
  fuhd: 'upscale_fuhd',
}

/** แพ็กเกจขั้นต่ำของขนาดนั้น (แอดมินตั้งในหน้า ตั้งค่าเครดิต) null = ทุกแพ็กเกจใช้ได้ */
export function requiredPlan(costs: CreditCosts | undefined, preset: UpscalePreset): UserType | null {
  const plan = costs?.minUserTypes?.[PRESET_ACTION[preset]]
  return plan && plan !== 'FREE' ? plan : null
}

/** แพ็กเกจของผู้ใช้ยังไม่ถึงขนาดนั้น ยังไม่รู้แพ็กเกจ (usage ยังไม่มา) ถือว่าใช้ได้ เซิร์ฟเวอร์ตรวจซ้ำอยู่แล้ว */
export function presetLocked(
  costs: CreditCosts | undefined,
  preset: UpscalePreset,
  userType: UserType | undefined,
): boolean {
  const plan = requiredPlan(costs, preset)
  return plan !== null && userType !== undefined && !planAtLeast(userType, plan)
}

/**
 * แพ็กเกจที่ต้องมีถึงจะอัปสเกลได้ ใช้เมื่อทุกขนาดที่เปิดอยู่ล็อกสำหรับผู้ใช้คนนี้
 * (แอดมินตั้งอัปสเกลเป็น PLUS ขึ้นไป ลูกค้าแพ็กเกจฟรีเห็นหน้าอัปเกรดแทนช่องเพิ่มรูป)
 * คืนแพ็กเกจต่ำสุดที่ปลดล็อกได้สักขนาด null = มีขนาดที่ใช้ได้ หรือยังไม่รู้ราคาหรือแพ็กเกจ
 */
export function upscaleLockedPlan(costs: CreditCosts | undefined, userType: UserType | undefined): UserType | null {
  if (!costs || userType === undefined) return null
  const enabled = PRESETS.filter(({ id }) => upscalePresetEnabled(costs, id))
  if (enabled.length === 0 || enabled.some(({ id }) => !presetLocked(costs, id, userType))) return null
  const plans = enabled.map(({ id }) => requiredPlan(costs, id) ?? 'FREE')
  return plans.reduce((lowest, plan) => (USER_TYPES.indexOf(plan) < USER_TYPES.indexOf(lowest) ? plan : lowest))
}

/**
 * costs = ราคาจากแอดมิน ใช้บอกเครดิตต่อขนาดและซ่อนขนาดที่ปิดอยู่
 * userType = แพ็กเกจของลูกค้า ขนาดที่แพ็กเกจยังไม่ถึงเลือกไม่ได้ (undefined = ยังไม่รู้ ถือว่าได้)
 * รูปโปร่งใสขยายได้ถึง 8K เหมือนรูปทั่วไป (เดิมจำกัด 4K เพราะเซิร์ฟเวอร์มี RAM 1 GB)
 */
export function presetOptions(
  width: number,
  height: number,
  costs: CreditCosts | undefined,
  userType: UserType | undefined,
): PresetOption[] {
  const sourceLong = Math.max(width, height)
  return PRESETS.map(({ id, label, longSide }) => {
    const target = targetSize(width, height, longSide)
    const pixels = target.width * target.height
    const unavailable =
      longSide <= sourceLong
        ? 'notLarger'
        : !reachable(sourceLong, longSide)
          ? 'tooSmall'
          : !upscalePresetEnabled(costs, id)
            ? 'off'
            : presetLocked(costs, id, userType)
              ? 'plan'
              : null
    return {
      preset: id,
      label,
      credits: upscaleCost(costs, id),
      ...target,
      megapixels: Math.round(pixels / 100_000) / 10,
      factor: Math.round((longSide / sourceLong) * 10) / 10,
      unavailable,
      plan: requiredPlan(costs, id),
    }
  })
}

/**
 * ระดับที่เลือกไว้ให้ก่อน: 4K ถ้าขยายได้ ไม่งั้นระดับใหญ่สุดที่ขยายได้
 * 4K ผ่านขั้นต่ำ Adobe Stock (4 ล้านพิกเซล) สบาย ๆ และไฟล์ยังไม่ใหญ่เกินไป
 */
export function defaultPreset(options: PresetOption[]): UpscalePreset | null {
  const usable = options.filter((option) => option.unavailable === null)
  return usable.find((option) => option.preset === 'uhd')?.preset ?? usable.at(-1)?.preset ?? null
}

export function presetShortName(preset: UpscalePreset): string {
  return PRESETS.find((item) => item.id === preset)?.short ?? preset
}

/**
 * เวลาโดยประมาณเป็นข้อความ ไม่ถึง 90 วินาทีบอกเป็นวินาที นานกว่านั้นบอกเป็นนาที (ปัดเศษ)
 * ตัวเลขมาจากเวลาจริงของงานล่าสุดบนเซิร์ฟเวอร์ (estimateSeconds ของงาน)
 */
export function estimateText(seconds: number): string {
  return seconds < 90
    ? i18n.t('upscale.estimateSeconds', { count: seconds })
    : i18n.t('upscale.estimateMinutes', { count: Math.round(seconds / 60) })
}

/** วัดขนาดรูปในเบราว์เซอร์ ก่อนอัป ให้เห็นตัวเลือกทันที เซิร์ฟเวอร์ตรวจจากไฟล์จริงอีกครั้ง */
export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}
