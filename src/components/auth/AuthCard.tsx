import { SignIn, SignUp } from '@clerk/clerk-react'

import { useClerkAppearance } from '@/hooks/useClerkAppearance'

/** กล่องเข้าสู่ระบบและสมัครสมาชิก แยกไว้เพื่อให้ใช้ hook ธีมร่วมกันได้ */
export function SignInCard() {
  return <SignIn appearance={useClerkAppearance()} />
}

export function SignUpCard() {
  return <SignUp appearance={useClerkAppearance()} />
}
