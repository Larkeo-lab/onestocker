/**
 * แยกว่าไฟล์ที่ผู้ใช้ใส่มาเป็นรูป วิดีโอ หรือชนิดที่ไม่รับ
 *
 * อยู่ที่เดียว เพราะทั้งช่องเลือกไฟล์และตัวคัดไฟล์ต้องรับชนิดเดียวกัน
 * ถ้าแยกกันเขียน วันที่เพิ่มชนิดใหม่ฝั่งเดียว ช่องเลือกไฟล์จะให้เลือกได้
 * แต่ไฟล์กลับถูกข้ามเงียบ ๆ
 */
import type { MediaKind } from '@/types/asset'

/** รูปที่เบราว์เซอร์ย่อได้ */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * วิดีโอที่เบราว์เซอร์ส่วนใหญ่เปิดได้
 *
 * รับเข้ามาได้ไม่ได้แปลว่าเปิดได้ทุกไฟล์ — .mov ที่เป็น ProRes หรือ HEVC
 * เปิดไม่ได้ในบางเบราว์เซอร์ ไฟล์พวกนั้นจะถูกข้ามพร้อมเหตุผลตอนดึงเฟรม
 */
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm']

export const ACCEPT_ATTRIBUTE = [
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...VIDEO_EXTENSIONS,
].join(',')

export function mediaKindOf(file: File): MediaKind | null {
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  if (VIDEO_TYPES.includes(file.type)) return 'video'

  // บางระบบไม่บอกชนิดของ .mov หรือ .m4v มา (file.type ว่าง) จึงดูนามสกุลแทน
  const name = file.name.toLowerCase()
  if (file.type === '' && VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'video'
  }
  return null
}
