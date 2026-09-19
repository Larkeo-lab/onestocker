import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

/** สีไล่จากต้นคำไปท้ายคำ ชุดเดียวกับ AuthWordmark บนหน้าเข้าสู่ระบบ */
const COLOR_FROM = '#1a5fe0'
const COLOR_TO = '#1fb2f0'

/** หน่วงระหว่างตัวอักษร (ms) คลื่นวิ่งจากซ้ายไปขวา */
const WAVE_STEP_MS = 80

/**
 * ตัวบอกว่ากำลังทำงาน แทนวงหมุน: ชื่อแอป "Onestocks..." เป็นคลื่นวนไปเรื่อย ๆ
 * ใช้ keyframe wordmark-wave ตัวเดียวกับโลโก้หน้าเข้าสู่ระบบ (ดู index.css)
 * ผู้ใช้ที่ตั้งลดการเคลื่อนไหวไว้เห็นเป็นตัวหนังสือนิ่ง
 */
export function BrandLoader({ label, className }: { label: string; className?: string }) {
  const letters = Array.from(`${siteConfig.name}...`)

  return (
    <span role="status" className={cn('inline-flex select-none', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="text-[18px] leading-none font-extrabold tracking-tight whitespace-nowrap">
        {letters.map((letter, index) => (
          <span
            // ตัวอักษรซ้ำกันได้ (s และ .) ใช้ตำแหน่งเป็น key ซึ่งไม่เปลี่ยนอยู่แล้ว
            key={index}
            className="inline-block animate-wordmark-wave motion-reduce:animate-none"
            style={{
              color: `color-mix(in oklab, ${COLOR_FROM}, ${COLOR_TO} ${Math.round((index / (letters.length - 1)) * 100)}%)`,
              animationDelay: `${index * WAVE_STEP_MS}ms`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    </span>
  )
}
