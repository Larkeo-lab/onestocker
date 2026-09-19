import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import {
  fetchContact,
  fetchCreditCosts,
  fetchHistory,
  fetchMe,
  fetchCheckout,
  fetchMeta,
  fetchMyPayments,
  fetchPlans,
  fetchRemoveBgResults,
  fetchSettings,
  fetchUpscales,
  type HistoryQuery,
  type Pagination,
  type RemoveBgQuery,
  type UpscaleQuery,
} from '@/lib/api'
import type { Checkout, Payment } from '@/types/payment'
import type { UserType } from '@/types/profile'
import { ADMIN_MANAGED_STALE_MS, SIGNED_URL_STALE_MS, queryKeys } from '@/lib/query'

/*
  hook อ่านข้อมูลจาก API ทุกตัวผ่าน cache ของ react-query (ดู lib/query.ts)

  หลายหน้าเรียก hook เดียวกันได้โดยไม่ยิงซ้ำ เช่น /meta ถูกใช้ทั้งใน
  GenerateProvider และหน้า Settings แต่ออกไปที่เซิร์ฟเวอร์ครั้งเดียว

  ค่าตั้งต้นคือไม่หมดอายุ ตัวที่ตั้ง staleTime เองด้านล่างคือข้อมูลที่เปลี่ยนจากฝั่งอื่นได้
  ส่วนที่เปลี่ยนเพราะผู้ใช้เองถูก invalidate จากจุดที่บันทึก:
    - settings    ← SettingsForm, store/platforms
    - history     ← GenerateProvider (สร้าง metadata เสร็จ)
    - removeBg    ← store/removeBg (ลบพื้นหลังเสร็จ), LibraryPage (ลบรูป)
    - upscale     ← store/upscale (อัปสเกลเสร็จ), LibraryPage (ลบรูป)
    - payments    ← CheckoutPage (แจ้งชำระ)
    - me          ← WelcomeDialog (ปิดป๊อปอัปต้อนรับ)
*/

/** โปรไฟล์ของคนที่ล็อกอินอยู่ */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: fetchMe })
}

/** ค่าคงที่ของระบบ เปลี่ยนเฉพาะตอน deploy เซิร์ฟเวอร์ใหม่ */
export function useMeta() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: fetchMeta })
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: fetchSettings })
}

/**
 * เครดิตต่อหนึ่งครั้งของแต่ละงาน และงานไหนเปิดให้ใช้ แอดมินแก้ได้
 *
 * sidebar ใช้ตัวนี้และไม่เคยถูกถอดออก ถ้าถามใหม่แค่ตอน mount จะไม่มีวันเห็นว่าแอดมินปิดงาน
 * จึงถามใหม่ทุกครั้งที่กลับมาที่แท็บและทุกครั้งที่เปิดหน้าที่ใช้ข้อมูลนี้
 */
export function useCreditCosts() {
  return useQuery({
    queryKey: queryKeys.creditCosts,
    queryFn: fetchCreditCosts,
    staleTime: ADMIN_MANAGED_STALE_MS,
    refetchOnWindowFocus: true,
  })
}

/** แพ็กเกจทุกระดับ ใช้ในป๊อปอัปอัปเกรด แอดมินแก้ราคาและรายละเอียดได้ */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: fetchPlans,
    staleTime: ADMIN_MANAGED_STALE_MS,
  })
}

/*
  สถานะการชำระเปลี่ยนจากฝั่งแอดมิน (อนุมัติ/ปฏิเสธ) ซึ่งลูกค้ารู้ไม่ได้
  จึงถามใหม่ตอนกลับมาที่แท็บ เฉพาะตอนที่ยังมีรายการรอตรวจอยู่เท่านั้น
  ลูกค้ามักสลับไปแอปธนาคารแล้วกลับมา ระหว่างนั้นทีมงานอาจตรวจเสร็จแล้ว
  ไม่มีรายการรอตรวจ = ไม่มีอะไรจะเปลี่ยน ไม่ต้องถาม
*/
function refetchWhilePending(data: Checkout | Payment[] | undefined): boolean | 'always' {
  if (!data) return false
  const pending = Array.isArray(data)
    ? data.some((payment) => payment.status === 'pending')
    : data.pending !== null
  // 'always' เพราะค่าตั้งต้นไม่หมดอายุ true เฉย ๆ จะไม่ถามใหม่
  return pending ? 'always' : false
}

/**
 * ข้อมูลหน้าชำระเงิน มีลิงก์รูป QR ที่หมดอายุ
 * 400/409 (แพ็กเกจซื้อไม่ได้) ลองซ้ำก็ไม่หาย
 */
export function useCheckout(userType: UserType) {
  return useQuery({
    queryKey: queryKeys.payments.checkout(userType),
    queryFn: () => fetchCheckout(userType),
    staleTime: SIGNED_URL_STALE_MS,
    // เปิดหน้าค้างไว้ระหว่างไปโอนเงิน ลิงก์ QR ต้องไม่หมดอายุตอนกลับมา
    refetchInterval: SIGNED_URL_STALE_MS,
    refetchOnWindowFocus: (query) => refetchWhilePending(query.state.data),
    retry: false,
  })
}

/** การแจ้งชำระล่าสุดของตัวเอง */
export function useMyPayments() {
  return useQuery({
    queryKey: queryKeys.payments.mine,
    queryFn: fetchMyPayments,
    refetchOnWindowFocus: (query) => refetchWhilePending(query.state.data),
  })
}

/** ช่องทางติดต่อ ใช้ในป๊อปอัปโควตาหมดและป๊อปอัปอัปเกรด แอดมินแก้ได้ */
export function useContact() {
  return useQuery({
    queryKey: queryKeys.contact,
    queryFn: fetchContact,
    staleTime: ADMIN_MANAGED_STALE_MS,
  })
}

/**
 * ประวัติการสร้างหนึ่งหน้า แยก cache ตามหน้าและตัวกรอง มีลิงก์รูปย่อที่หมดอายุ
 *
 * กลับไปหน้าหรือตัวกรองที่เคยเปิดแล้วจะขึ้นทันทีจาก cache
 * keepPreviousData ค้างรายการเดิมไว้ระหว่างรอหน้าใหม่ ตารางจึงไม่กระพริบว่าง
 */
export function useHistory(query: HistoryQuery) {
  return useQuery({
    queryKey: queryKeys.history.page(query),
    queryFn: () => fetchHistory(query),
    placeholderData: keepPreviousData,
    staleTime: SIGNED_URL_STALE_MS,
  })
}

/** ผลลัพธ์การลบพื้นหลังหนึ่งหน้า ใหม่ไปเก่า มีลิงก์ดาวน์โหลดที่หมดอายุ */
export function useRemoveBgResults(query: RemoveBgQuery) {
  return useQuery({
    queryKey: queryKeys.removeBg.page(query),
    queryFn: () => fetchRemoveBgResults(query),
    placeholderData: keepPreviousData,
    staleTime: SIGNED_URL_STALE_MS,
    // เปิดคลังรูปค้างไว้แล้วค่อยกดดาวน์โหลด ลิงก์ต้องยังใช้ได้
    refetchInterval: SIGNED_URL_STALE_MS,
  })
}

/** ประวัติใต้หน้าลบพื้นหลังและหน้าอัปสเกล โหลดทีละเท่านี้ กดดูเพิ่มเติมแล้วต่อท้ายอีกเท่านี้ */
export const HISTORY_PAGE_SIZE = 20

/*
  ประวัติทั้งหมด ใหม่ไปเก่า โหลดหน้าแรกก่อน หน้าถัดไปโหลดเมื่อเรียก fetchNextPage

  ถูกล้างพร้อม queryKeys.removeBg.all / queryKeys.upscale.all (ทำเสร็จ หรือลบรูป)
  ทุกหน้าที่โหลดแล้วโหลดใหม่ตามลำดับ รายการจึงต่อกันถูกต้องแม้มีรูปใหม่แทรกด้านบน
  เปิดหน้าค้างไว้แล้วค่อยกดดาวน์โหลด ลิงก์ต้องยังใช้ได้ จึงโหลดใหม่ก่อนลิงก์หมดอายุ
*/
const historyOptions = {
  initialPageParam: 1,
  getNextPageParam: ({ pagination }: { pagination: Pagination }) =>
    pagination.page < pagination.totalPages ? pagination.page + 1 : undefined,
  staleTime: SIGNED_URL_STALE_MS,
  refetchInterval: SIGNED_URL_STALE_MS,
}

export function useRemoveBgHistory() {
  return useInfiniteQuery({
    ...historyOptions,
    queryKey: queryKeys.removeBg.history,
    queryFn: ({ pageParam }) => fetchRemoveBgResults({ page: pageParam, limit: HISTORY_PAGE_SIZE }),
  })
}

export function useUpscaleHistory() {
  return useInfiniteQuery({
    ...historyOptions,
    queryKey: queryKeys.upscale.history,
    queryFn: ({ pageParam }) => fetchUpscales({ page: pageParam, limit: HISTORY_PAGE_SIZE }),
  })
}

/** ผลลัพธ์การอัปสเกลหนึ่งหน้า ใหม่ไปเก่า มีลิงก์ดาวน์โหลดที่หมดอายุ */
export function useUpscales(query: UpscaleQuery) {
  return useQuery({
    queryKey: queryKeys.upscale.page(query),
    queryFn: () => fetchUpscales(query),
    placeholderData: keepPreviousData,
    staleTime: SIGNED_URL_STALE_MS,
    refetchInterval: SIGNED_URL_STALE_MS,
  })
}
