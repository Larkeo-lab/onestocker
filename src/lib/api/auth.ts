import type { Profile } from '@/types/profile'

import { apiGet, apiPost, apiPut } from './client'

/**
 * เครื่องนี้ยังสมัครบัญชีใหม่ได้ไหม (เพดานบัญชีต่อเครื่องที่แอดมินตั้ง) ไม่ต้องล็อกอิน
 * รหัสเครื่องส่งไปกับทุกคำขออยู่แล้ว (X-Device-Id ดู client.ts)
 */
export async function fetchSignupAllowed(): Promise<boolean> {
  const result = await apiGet<{ allowed: boolean }>('/public/signup-check')
  return result.allowed
}

/** ถามว่าคนที่ถือ token อยู่ตอนนี้คือใคร */
export async function fetchMe(): Promise<Profile> {
  return apiGet<Profile>('/auth/me')
}

/** บันทึกว่าผู้ใช้ปิด popup ต้อนรับแล้ว จะไม่แสดงอีกทุกเครื่อง */
export async function dismissWelcome(): Promise<void> {
  await apiPost('/auth/welcome/dismiss')
}

/** บันทึกภาษาที่ผู้ใช้เปลี่ยนในแอป อีเมลแจ้งเตือนฉบับถัดไปจะใช้ภาษานี้ */
export async function saveLanguage(language: string): Promise<void> {
  await apiPut('/auth/language', { language })
}
