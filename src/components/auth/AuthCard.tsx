import { SignIn, SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

import { useClerkAppearance } from '@/hooks/useClerkAppearance'
import { env } from '@/lib/env'

/**
 * ตอนข้ามล็อกอินไม่มี ClerkProvider อยู่ กล่องของ Clerk จึง render ไม่ได้
 * ถ้าปล่อยไว้ การพิมพ์ /sign-in เองจะทำให้ทั้งหน้าพัง
 */
function BypassNotice() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-[13px] font-medium">ข้ามหน้าล็อกอินอยู่</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
        ตั้ง <span className="font-mono">VITE_AUTH_DEV_BYPASS=false</span> แล้ว
        ใช้คีย์ของ development instance ถ้าต้องการทดสอบการเข้าสู่ระบบจริง
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        กลับเข้าแอป
      </Link>
    </div>
  )
}

/** กล่องเข้าสู่ระบบและสมัครสมาชิก แยกไว้เพื่อให้ใช้ hook ธีมร่วมกันได้ */
export function SignInCard() {
  const appearance = useClerkAppearance()
  if (env.authDevBypass) return <BypassNotice />
  return <SignIn appearance={appearance} />
}

export function SignUpCard() {
  const appearance = useClerkAppearance()
  if (env.authDevBypass) return <BypassNotice />
  return <SignUp appearance={appearance} />
}
