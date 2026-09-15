import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  fetchContact,
  fetchHistory,
  fetchMe,
  fetchCheckout,
  fetchMeta,
  fetchMyPayments,
  fetchPlans,
  fetchSettings,
  type HistoryQuery,
} from '@/lib/api'
import type { UserType } from '@/types/profile'
import { queryKeys } from '@/lib/query'

/*
  hook อ่านข้อมูลจาก API ทุกตัวผ่าน cache ของ react-query (ดู lib/query.ts)

  หลายหน้าเรียก hook เดียวกันได้โดยไม่ยิงซ้ำ เช่น /meta ถูกใช้ทั้งใน
  AppShell, GenerateProvider และหน้า Settings แต่ออกไปที่เซิร์ฟเวอร์ครั้งเดียว
*/

/** โปรไฟล์ของคนที่ล็อกอินอยู่ */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: fetchMe })
}

/** ค่าคงที่ของระบบ เปลี่ยนน้อยมาก */
export function useMeta() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: fetchMeta })
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: fetchSettings })
}

/** แพ็กเกจทุกระดับ ใช้ในป๊อปอัปอัปเกรด โหลดตอนเปิดป๊อปอัปครั้งแรกเท่านั้น */
export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans, queryFn: fetchPlans })
}

/*
  ลิงก์รูป QR ในหน้าชำระเงินหมดอายุใน 1 ชั่วโมง ถามใหม่ก่อนหมดเสมอ
  คนที่เปิดหน้าค้างไว้ระหว่างไปโอนเงินจะได้ไม่เจอรูปแตกตอนกลับมา
*/
const CHECKOUT_REFRESH_MS = 30 * 60 * 1000

/**
 * ข้อมูลหน้าชำระเงิน ถามใหม่ตอนกลับมาที่แท็บด้วย
 * ลูกค้ามักสลับไปแอปธนาคารแล้วกลับมา ระหว่างนั้นทีมงานอาจตรวจรายการเสร็จแล้ว
 */
export function useCheckout(userType: UserType) {
  return useQuery({
    queryKey: queryKeys.payments.checkout(userType),
    queryFn: () => fetchCheckout(userType),
    staleTime: 0,
    refetchInterval: CHECKOUT_REFRESH_MS,
    refetchOnWindowFocus: true,
    // 400/409 (แพ็กเกจซื้อไม่ได้) ลองซ้ำก็ไม่หาย
    retry: false,
  })
}

/** การแจ้งชำระล่าสุดของตัวเอง */
export function useMyPayments() {
  return useQuery({
    queryKey: queryKeys.payments.mine,
    queryFn: fetchMyPayments,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

/** ช่องทางติดต่อ ใช้ในป๊อปอัปโควตาหมดและป๊อปอัปอัปเกรด */
export function useContact() {
  return useQuery({ queryKey: queryKeys.contact, queryFn: fetchContact })
}

/**
 * ประวัติการสร้างหนึ่งหน้า แยก cache ตามหน้าและตัวกรอง
 *
 * กลับไปหน้าหรือตัวกรองที่เคยเปิดแล้วจะขึ้นทันทีจาก cache
 * keepPreviousData ค้างรายการเดิมไว้ระหว่างรอหน้าใหม่ ตารางจึงไม่กระพริบว่าง
 */
export function useHistory(query: HistoryQuery) {
  return useQuery({
    queryKey: queryKeys.history.page(query),
    queryFn: () => fetchHistory(query),
    placeholderData: keepPreviousData,
  })
}
