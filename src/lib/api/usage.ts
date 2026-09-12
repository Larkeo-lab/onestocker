import type { Usage } from '@/types/usage'

import { apiGet } from './client'

/**
 * ยอดที่ใช้ไปในเดือนนี้ของคนที่ถือ token อยู่
 *
 * เพดานมาจากตาราง user_type_quotas ซึ่งแอดมินแก้ได้จากหน้า one-stock-admin
 * ฝั่งนี้จึงต้องอ่านค่าจาก API เสมอ ห้ามเขียนตัวเลขตายตัวไว้ในโค้ด
 */
export async function fetchUsage(): Promise<Usage> {
  return apiGet<Usage>('/usage')
}
