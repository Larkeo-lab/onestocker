import { queryClient, queryKeys } from '@/lib/query'
import type { CreditCosts } from '@/types/creditCost'

/**
 * ราคาของงานจาก cache สำหรับโค้ดนอกคอมโพเนนต์ (store) ที่เรียก hook ไม่ได้
 *
 * ใช้แค่บวกตัวเลขเครดิตบน header ให้ขยับทันทีระหว่างรอยอดจริง ยังไม่มีใน cache ใช้ 1
 * ค่าที่ผิดจะถูกทับด้วยยอดจริงจากเซิร์ฟเวอร์ในไม่กี่วินาที (ดู markUsed ใน store/usage.ts)
 */
export function cachedCreditCost(action: 'generate' | 'removeBg'): number {
  return queryClient.getQueryData<CreditCosts>(queryKeys.creditCosts)?.[action] ?? 1
}
