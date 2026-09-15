import { env } from '@/lib/env'

/**
 * ต้องตรงกับ FreePlan ใน server/internal/feature/quota/dto.go
 * monthlyLimit เป็น null เมื่อ FREE ไม่จำกัด หรือยังไม่ได้ตั้งค่า
 */
type FreePlan = {
  userType: string
  monthlyLimit: number | null
}

/** ช่องในปุ่มที่ LandingPage วาดไว้ — ต้องตรงกับ data-* ใน LandingPage.tsx */
const SELECTOR = {
  label: '[data-free-credits-label]',
  count: '[data-free-credits-count]',
  fallback: '[data-free-credits-fallback]',
}

/**
 * เติมจำนวนเครดิตฟรีที่แอดมินตั้งไว้ลงปุ่มสมัครในหน้า landing
 *
 * หน้า landing เป็น HTML นิ่งที่ build ไว้ก่อน จำนวนเครดิตจึงต้องมาเติมตอนเปิดหน้า
 * ไม่งั้นแอดมินเปลี่ยนตัวเลขแล้วปุ่มจะยังเป็นเลขเก่าจนกว่าจะ build ใหม่
 *
 * ปุ่มแสดงข้อความสำรอง ("เริ่มใช้ฟรี") ไว้ก่อนเสมอ แล้วค่อยสลับเมื่อได้ตัวเลขจริง
 * อ่านไม่สำเร็จ ไม่จำกัด หรือเป็นศูนย์ ก็คงข้อความสำรองไว้ ไม่เดาตัวเลข
 */
export async function showFreeCredits(): Promise<void> {
  const limit = await fetchFreeLimit()
  if (limit === null) return

  for (const label of document.querySelectorAll<HTMLElement>(SELECTOR.label)) {
    const count = label.querySelector<HTMLElement>(SELECTOR.count)
    const fallback = label.parentElement?.querySelector<HTMLElement>(SELECTOR.fallback)
    if (!count) continue

    count.textContent = String(limit)
    label.hidden = false
    if (fallback) fallback.hidden = true
  }
}

/** คืนจำนวนเครดิตเมื่อเป็นจำนวนเต็มบวก กรณีอื่นทั้งหมดคืน null */
async function fetchFreeLimit(): Promise<number | null> {
  try {
    const response = await fetch(`${env.apiUrl}/public/free-credits`)
    if (!response.ok) return null

    const body = (await response.json()) as { data?: FreePlan }
    const limit = body.data?.monthlyLimit
    return typeof limit === 'number' && Number.isInteger(limit) && limit > 0
      ? limit
      : null
  } catch {
    // ปุ่มสมัครต้องใช้ได้เสมอ API ล่มก็แค่ไม่มีตัวเลข
    return null
  }
}
