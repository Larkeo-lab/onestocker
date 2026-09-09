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
}

export function fullName(profile: Profile | null): string {
  if (!profile) return ''
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}
