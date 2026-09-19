import { useAuth } from '@clerk/clerk-react'
import { useState } from 'react'

import { siteConfig } from '@/config/site'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

/** หน่วงระหว่างตัวอักษรตอนลอยขึ้น (ms) */
const ENTER_STEP_MS = 55

/**
 * คลื่นตัวแรกเริ่มเมื่อไหร่ (ms) ต้องนานกว่า animate-wordmark-in (700ms)
 * ตัวอักษรแต่ละตัวจะลอยขึ้นเสร็จก่อนเริ่มคลื่นของตัวเองเสมอ
 */
const WAVE_START_MS = 1000
const WAVE_STEP_MS = 80

/** สีไล่จากต้นคำไปท้ายคำ ฟ้าเข้มไปฟ้าสว่าง โทนเดียวกับ --primary อ่านออกทั้งโหมดมืดและสว่าง */
const COLOR_FROM = '#1a5fe0'
const COLOR_TO = '#1fb2f0'

/**
 * ชื่อแอปแบบตัวหนังสือบนหน้าเข้าสู่ระบบและสมัครสมาชิก
 *
 * ตัวอักษรลอยขึ้นทีละตัวตอนเปิดหน้า แล้วเป็นคลื่นวนไประหว่างรอ Clerk โหลด
 * ซึ่งเป็นช่วงที่หน้ามีแค่ชื่อแอปอยู่อย่างเดียว คลื่นจึงบอกว่ากำลังโหลดอยู่
 * Clerk โหลดเสร็จแล้วคลื่นวิ่งจนจบรอบแล้วหยุด
 */
export function AuthWordmark() {
  // ตอนข้ามล็อกอินไม่มี ClerkProvider เรียก useAuth ไม่ได้ และไม่มีอะไรให้รอ
  return env.authDevBypass ? <Wordmark loading={false} /> : <ClerkWordmark />
}

function ClerkWordmark() {
  const { isLoaded } = useAuth()
  return <Wordmark loading={!isLoaded} />
}

function Wordmark({ loading }: { loading: boolean }) {
  const letters = Array.from(siteConfig.name)

  return (
    <div className="select-none" aria-busy={loading || undefined}>
      <span className="sr-only">{siteConfig.name}</span>
      <span
        aria-hidden
        className="block text-[40px] leading-none font-extrabold tracking-tight whitespace-nowrap"
      >
        {letters.map((letter, index) => (
          <Letter
            // ตัวอักษรซ้ำกันได้ (s สองตัว) ใช้ตำแหน่งเป็น key ซึ่งไม่เปลี่ยนอยู่แล้ว
            key={index}
            letter={letter}
            index={index}
            count={letters.length}
            loading={loading}
          />
        ))}
      </span>
    </div>
  )
}

function Letter({
  letter,
  index,
  count,
  loading,
}: {
  letter: string
  index: number
  count: number
  loading: boolean
}) {
  /*
    เปิดคลื่นทันทีที่ยังโหลดอยู่ แต่ปิดตอนจบรอบเท่านั้น (onAnimationIteration)
    ถ้าถอด class กลางรอบ ตัวอักษรที่ลอยอยู่จะดีดกลับที่เดิมทันที
    เปิดหน้ามาตอน Clerk โหลดไว้แล้ว (เช่นกดออกจากระบบ) ไม่มีคลื่น มีแค่ตอนลอยขึ้น
  */
  const [waving, setWaving] = useState(loading)
  if (loading && !waving) setWaving(true)

  const progress = count > 1 ? Math.round((index / (count - 1)) * 100) : 0

  return (
    <span
      className="inline-block animate-wordmark-in motion-reduce:animate-none"
      style={{ animationDelay: `${index * ENTER_STEP_MS}ms` }}
    >
      <span
        className={cn(
          'inline-block',
          waving && 'animate-wordmark-wave motion-reduce:animate-none',
        )}
        style={{
          color: `color-mix(in oklab, ${COLOR_FROM}, ${COLOR_TO} ${progress}%)`,
          animationDelay: waving
            ? `${WAVE_START_MS + index * WAVE_STEP_MS}ms`
            : undefined,
        }}
        onAnimationIteration={() => {
          if (!loading) setWaving(false)
        }}
      >
        {letter}
      </span>
    </span>
  )
}
