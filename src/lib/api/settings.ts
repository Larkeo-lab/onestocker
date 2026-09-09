import type { UserSettings } from '@/types/settings'

import { apiGet, apiPut } from './client'

export async function fetchSettings(): Promise<UserSettings> {
  return apiGet<UserSettings>('/settings')
}

export async function saveSettings(
  settings: UserSettings,
): Promise<UserSettings> {
  return apiPut<UserSettings>('/settings', settings)
}
