import { intlLocale } from '@/config/i18n'

/**
 * วันที่แบบวันกับเดือน ตามภาษาที่เลือก เช่น "1 ตุลาคม" หรือ "October 1"
 * ใช้บอกวันที่เครดิตรีเซ็ต ซึ่งเป็นวันที่ 1 ของเดือนถัดไปเสมอ จึงไม่ต้องมีปี
 */
export function formatDayMonth(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'long',
  }).format(date)
}
