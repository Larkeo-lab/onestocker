/**
 * รวม className และแก้ class ของ Tailwind ที่ชนกัน (ตัวหลังชนะ)
 * เช่น cn("px-2", "px-4") → "px-4"
 *
 * ใช้แพ็กเกจ cn ของ shadcn (ทำงานแบบ clsx + tailwind-merge)
 * component ที่ติดตั้งผ่าน shadcn CLI ก็ import ตัวนี้
 */
export { cn } from "cn"

/** 2026-09-10T08:30:00Z -> "10 ก.ย. 2026 15:30" */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
