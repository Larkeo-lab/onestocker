import { USER_TYPES, type UserType } from '@/types/profile'

/**
 * สีไล่เฉดของแพ็กเกจเสียเงิน ใช้กับวงแหวนรอบรูปโปรไฟล์และขอบของตัวเลือกที่ต้องใช้แพ็กเกจสูง
 * สองที่ใช้ชุดเดียวกัน ลูกค้าจะจำได้ว่าสีนี้คือของแพ็กเกจเสียเงิน
 */
export const PAID_GRADIENT = 'bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500'

/** แพ็กเกจนี้เท่ากับหรือสูงกว่า min ตามลำดับใน USER_TYPES ต้องตรงกับ usertype.AtLeast ฝั่ง Go */
export function planAtLeast(current: UserType, min: UserType): boolean {
  return USER_TYPES.indexOf(current) >= USER_TYPES.indexOf(min)
}
