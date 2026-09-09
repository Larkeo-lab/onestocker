type ClassValue = string | number | null | false | undefined

/**
 * รวม className แบบข้าม falsy value
 * ถ้าต้องการให้แก้ class ที่ชนกันของ Tailwind ด้วย ให้ติดตั้ง
 * `clsx` + `tailwind-merge` แล้วเปลี่ยนมาใช้ `twMerge(clsx(inputs))`
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}

/** 2026-09-10T08:30:00Z -> "10 ก.ย. 2026 15:30" */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
