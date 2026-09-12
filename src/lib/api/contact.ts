import type { ContactChannels } from '@/types/contact'

import { apiGet } from './client'

/**
 * ช่องทางติดต่อที่แอดมินตั้งไว้
 *
 * โหลดตอนที่ต้องใช้จริงเท่านั้น (ป๊อปอัปตอนโควตาหมด) ผู้ใช้ส่วนใหญ่
 * ไม่เคยเห็นหน้านั้น จึงไม่ควรยิงคำขอนี้ทุกครั้งที่เปิดแอป
 */
export async function fetchContact(): Promise<ContactChannels> {
  return apiGet<ContactChannels>('/contact')
}
