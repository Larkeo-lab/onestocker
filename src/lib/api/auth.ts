import type { Profile } from '@/types/profile'

import { apiGet } from './client'

/** ถามว่าคนที่ถือ token อยู่ตอนนี้คือใคร */
export async function fetchMe(): Promise<Profile> {
  return apiGet<Profile>('/auth/me')
}
