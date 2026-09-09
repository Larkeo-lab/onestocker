import { apiGet } from './client'

export type MetaLanguage = {
  code: string
  name: string
  native: string
  /** true = ปิดไม่ได้ ต้องออกภาษานี้เสมอ */
  primary: boolean
}

export type Meta = {
  provider: string
  model: string
  /** จำนวนรูปสูงสุดต่อหนึ่งรอบ */
  maxAssets: number
  keywordsMax: number
  languages: MetaLanguage[]
}

/**
 * ค่าคงที่ของระบบที่เซิร์ฟเวอร์เป็นเจ้าของ
 *
 * อ่านจาก API แทนที่จะเขียนไว้ในโค้ดฝั่งนี้ เพราะถ้าเซิร์ฟเวอร์
 * เปลี่ยนเพดานจำนวนรูป หน้าเว็บจะได้รู้ตามโดยไม่ต้อง deploy ใหม่
 */
export async function fetchMeta(): Promise<Meta> {
  return apiGet<Meta>('/meta')
}
