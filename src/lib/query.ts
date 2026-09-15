import { QueryClient } from '@tanstack/react-query'

import type { HistoryQuery } from '@/lib/api/history'

/**
 * cache ของข้อมูลจาก API ใช้ร่วมกันทั้งแอป
 *
 * ตั้งไว้ให้ "กลับมาหน้าเดิมแล้วไม่ต้องยิง API ซ้ำ ถ้าข้อมูลยังไม่เก่า"
 * - staleTime 5 นาที → เปิดหน้าเดิมซ้ำในช่วงนี้ได้ข้อมูลจาก cache ทันทีโดยไม่ยิงคำขอ
 * - gcTime 30 นาที → ข้อมูลที่ไม่มีหน้าไหนใช้แล้วจะถูกทิ้งจากหน่วยความจำหลังผ่านไปเท่านี้
 * - refetchOnWindowFocus ปิด → แค่สลับแท็บกลับมาไม่ควรยิงใหม่
 *   ข้อมูลจะสดเพราะหมดอายุเอง หรือถูกสั่ง invalidate หลังบันทึก
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
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
  payments: {
    mine: ['payments', 'mine'] as const,
    checkout: (userType: string) => ['payments', 'checkout', userType] as const,
  },
  history: {
    all: ['history'] as const,
    page: (query: HistoryQuery) => ['history', query] as const,
  },
}
