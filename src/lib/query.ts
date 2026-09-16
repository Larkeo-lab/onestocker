import { QueryClient } from '@tanstack/react-query'

import type { HistoryQuery } from '@/lib/api/history'
import type { RemoveBgQuery } from '@/lib/api/removeBg'

/**
 * ข้อมูลที่แอดมินแก้ได้ (ราคาแพ็กเกจ เครดิตต่องาน ช่องทางติดต่อ)
 *
 * ฝั่งลูกค้าไม่มีทางรู้ว่าแอดมินแก้เมื่อไร จึงยอมให้ถามใหม่ได้ แต่ไม่ถี่กว่านี้
 * และถามเฉพาะตอนมีหน้าที่ใช้ข้อมูลนั้นเปิดขึ้นมา ไม่ได้ถามเป็นรอบ
 */
export const ADMIN_MANAGED_STALE_MS = 10 * 60 * 1000

/**
 * ข้อมูลที่มีลิงก์รูปบน R2 (รูปย่อ สลิป QR) ลิงก์พวกนี้หมดอายุใน 1 ชั่วโมง
 *
 * ต้องถามใหม่ก่อนลิงก์หมด ไม่งั้นกลับมาหน้าเดิมแล้วเจอรูปแตกหรือกดดาวน์โหลดไม่ได้
 * เผื่อไว้ 15 นาทีสำหรับคนที่เปิดหน้าค้างไว้แล้วค่อยกด
 */
export const SIGNED_URL_STALE_MS = 45 * 60 * 1000

/**
 * cache ของข้อมูลจาก API ใช้ร่วมกันทั้งแอป
 *
 * หลักคือ "ไม่มีอะไรเปลี่ยนก็ไม่ยิงซ้ำ" — กลับมาหน้าเดิมกี่ครั้งก็ได้ข้อมูลจาก cache ทันที
 * - staleTime ไม่หมดอายุ → ข้อมูลของผู้ใช้เองเปลี่ยนได้ทางเดียวคือผู้ใช้กดบันทึก/สร้าง/ลบ
 *   จุดนั้นสั่ง invalidate หรือ setQueryData ให้ query ที่เกี่ยวข้องเอง (ค้นหา queryKeys ในโค้ด)
 *   ข้อมูลที่เปลี่ยนจากฝั่งอื่นได้ตั้งเวลาเองใน hooks/queries.ts ด้วย ADMIN_MANAGED_STALE_MS / SIGNED_URL_STALE_MS
 * - gcTime 24 ชั่วโมง → ออกจากหน้าไปนานแค่ไหนก็ยังมี cache ให้ใช้ตอนกลับมา ข้อมูลของแอปนี้เล็ก ไม่เปลืองหน่วยความจำ
 * - refetchOnWindowFocus ปิด → แค่สลับแท็บกลับมาไม่ยิงใหม่ ยกเว้น query ที่เปิดไว้เองเพราะรอสถานะจากแอดมิน
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/**
 * key ของทุก query รวมไว้ที่เดียว ตัวที่อ่านกับตัวที่สั่ง invalidate จะได้ตรงกันเสมอ
 *
 * history ทุกหน้าและทุกตัวกรองขึ้นต้นด้วย ['history'] สั่ง invalidate
 * ด้วย queryKeys.history.all ครั้งเดียวจึงล้างได้ทั้งหมด
 */
export const queryKeys = {
  me: ['me'] as const,
  meta: ['meta'] as const,
  settings: ['settings'] as const,
  contact: ['contact'] as const,
  plans: ['plans'] as const,
  creditCosts: ['creditCosts'] as const,
  payments: {
    mine: ['payments', 'mine'] as const,
    checkout: (userType: string) => ['payments', 'checkout', userType] as const,
  },
  history: {
    all: ['history'] as const,
    page: (query: HistoryQuery) => ['history', query] as const,
  },
  removeBg: {
    all: ['removeBg'] as const,
    page: (query: RemoveBgQuery) => ['removeBg', query] as const,
  },
}
