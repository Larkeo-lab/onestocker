import type { Plan } from '@/types/plan'

import { apiGet } from './client'

/**
 * แพ็กเกจทุกระดับ เรียง FREE → ULTRA เซิร์ฟเวอร์เรียงมาให้แล้ว
 *
 * เป็นเส้นสาธารณะ ไม่ต้องล็อกอิน (เผื่อใช้บนหน้า landing ภายหลัง)
 * เซิร์ฟเวอร์ให้เบราว์เซอร์ cache หนึ่งนาที แอดมินแก้ราคาแล้วอาจเห็นของเดิมได้ไม่เกินนั้น
 */
export async function fetchPlans(): Promise<Plan[]> {
  return apiGet<Plan[]>('/public/plans')
}
