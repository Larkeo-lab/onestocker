import i18n from '@/config/i18n'
import { upscaleCost, upscalePresetEnabled } from '@/lib/creditCosts'
import { HEIC_ACCEPT } from '@/lib/heic'
import type { CreditCosts } from '@/types/creditCost'
import type { UpscalePreset } from '@/types/upscale'

/** ต้องตรงกับ MaxInputBytes ใน server/internal/feature/upscale/validation.go */
export const MAX_INPUT_MB = 20

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

/**
 * รูปโปร่งใสขยายได้ถึง 4K ต้องตรงกับ transparentMaxLongSide ใน server/internal/feature/upscale/validation.go
 * (เซิร์ฟเวอร์ต้องใส่ความโปร่งใสคืนเองทั้งรูป 8K ใช้หน่วยความจำมากเกินไป)
 *
 * transparent ในหน้านี้มาจากชนิดไฟล์ (PNG) ส่วนเซิร์ฟเวอร์ดูจากพิกเซลจริง
 * PNG ที่ทึบทั้งรูปจึงถูกกันไว้ที่ 4K ทั้งที่เซิร์ฟเวอร์ทำ 8K ให้ได้ ยอมเสียตรงนี้ ดีกว่าต้องอ่านทุกพิกเซลในเบราว์เซอร์
 */
export const TRANSPARENT_MAX_LONG_SIDE = 3840

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
   * notLarger = รูปใหญ่เท่านี้อยู่แล้ว, tooSmall = ต้องขยายเกิน 6 เท่า,
   * transparent = รูปโปร่งใสได้ถึง 4K, off = แอดมินปิดขนาดนี้
   */
  unavailable: 'notLarger' | 'tooSmall' | 'transparent' | 'off' | null
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

/**
 * costs = ราคาจากแอดมิน ใช้บอกเครดิตต่อขนาดและซ่อนขนาดที่ปิดอยู่
 * transparent = ต้นฉบับอาจโปร่งใส (PNG) ขยายได้ถึง 4K
 */
export function presetOptions(
  width: number,
  height: number,
  costs: CreditCosts | undefined,
  transparent: boolean,
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
          : transparent && longSide > TRANSPARENT_MAX_LONG_SIDE
            ? 'transparent'
            : upscalePresetEnabled(costs, id)
              ? null
              : 'off'
    return {
      preset: id,
      label,
      credits: upscaleCost(costs, id),
      ...target,
      megapixels: Math.round(pixels / 100_000) / 10,
      factor: Math.round((longSide / sourceLong) * 10) / 10,
      unavailable,
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
