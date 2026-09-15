import i18n from '@/config/i18n'
import { ApiError } from '@/lib/api'

/** แปลง error อะไรก็ตามให้เป็นข้อความที่เอาไปแสดงได้ */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return i18n.t('common.unknownError')
}
