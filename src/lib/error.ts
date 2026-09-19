import i18n from '@/config/i18n'
import { ApiError } from '@/lib/api'
import { OFFLINE_CODE } from '@/lib/network'

/** แปลง error อะไรก็ตามให้เป็นข้อความที่เอาไปแสดงได้ */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return i18n.t('common.unknownError')
}

/** ล้มเพราะเน็ตหลุด ไม่ใช่ข้อผิดพลาดจริง — แสดงเป็นสถานะออฟไลน์แทนกล่องสีแดง */
export function isOfflineError(error: unknown): boolean {
  return error instanceof ApiError && error.code === OFFLINE_CODE
}
