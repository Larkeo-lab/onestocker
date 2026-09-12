/**
 * ระดับแพ็กเกจของผู้ใช้
 *
 * ประกาศเป็น const array แล้วค่อยดึง type ออกมา จะได้มีทั้งค่าให้วนลูป
 * (เช่น ทำ dropdown ในหน้า admin) และ type ให้ TypeScript ตรวจในชุดเดียวกัน
 *
 * ต้องตรงกับสามที่:
 *   - usertype.Type ฝั่ง Go (server/internal/shared/usertype)
 *   - constraint profiles_user_type_check ในฐานข้อมูล
 *   - ที่นี่
 */
export const USER_TYPES = ['FREE', 'PLUS', 'PRO', 'ULTRA'] as const

export type UserType = (typeof USER_TYPES)[number]

/** ระดับที่ผู้ใช้ได้ทันทีที่สมัคร ตรงกับ usertype.Default ฝั่ง Go */
export const DEFAULT_USER_TYPE: UserType = 'FREE'

/**
 * ข้อมูลผู้ใช้ที่แสดงบน sidebar
 *
 * ไม่มีฟิลด์ password โดยตั้งใจ — Clerk เป็นผู้เก็บและ hash รหัสผ่านให้
 * ฝั่ง Go จะเป็นคนอ่าน Clerk แล้วส่งกลับมาเป็นก้อนนี้
 */
export type Profile = {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  /** รูปที่อัปไว้ใน Clerk ถ้ามี ไม่งั้นเป็น Gravatar ที่อิงอีเมล */
  profileUrl: string | null
  /** ระดับแพ็กเกจ เจ้าของค่านี้คือฐานข้อมูลฝั่งเรา ไม่ใช่ Clerk */
  userType: UserType
}

export function fullName(profile: Profile | null): string {
  if (!profile) return ''
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}
