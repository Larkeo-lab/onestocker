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

/**
 * ชนิดไฟล์ของ EPS ที่ใช้ตอนขอลิงก์อัปและตอน PUT ขึ้น R2
 * ต้องตรงกับ VectorContentType ฝั่ง Go ไม่งั้นลายเซ็นของลิงก์ไม่ตรงกับคำขอจริง
 */
export const VECTOR_CONTENT_TYPE = 'application/postscript'

/*
  ไฟล์เวกเตอร์ที่เบราว์เซอร์เปิดเองไม่ได้ ต้องให้เซิร์ฟเวอร์แปลงเป็นรูปก่อน

  ชนิดที่ระบบปฏิบัติการบอกมาสำหรับ .eps ไม่ตรงกันสักเจ้า บางเครื่องบอกว่าว่างเปล่า
  จึงตัดสินจากนามสกุลเป็นหลัก แล้วใช้รายการนี้เป็นตัวช่วยอีกชั้น
*/
const VECTOR_TYPES = [
  VECTOR_CONTENT_TYPE,
  'application/eps',
  'application/x-eps',
  'image/eps',
  'image/x-eps',
]

const VECTOR_EXTENSIONS = ['.eps']

export const ACCEPT_ATTRIBUTE = [
  ...IMAGE_TYPES,
  ...VIDEO_TYPES,
  ...VIDEO_EXTENSIONS,
  VECTOR_CONTENT_TYPE,
  ...VECTOR_EXTENSIONS,
].join(',')

export function mediaKindOf(file: File): MediaKind | null {
  if (IMAGE_TYPES.includes(file.type)) return 'image'
  if (VIDEO_TYPES.includes(file.type)) return 'video'

  const name = file.name.toLowerCase()

  // ชื่อไฟล์ลงท้าย .eps ถือว่าเป็นเวกเตอร์เสมอ ไม่ว่าเครื่องจะบอกชนิดว่าอะไร
  if (
    VECTOR_TYPES.includes(file.type) ||
    VECTOR_EXTENSIONS.some((ext) => name.endsWith(ext))
  ) {
    return 'vector'
  }

  // บางระบบไม่บอกชนิดของ .mov หรือ .m4v มา (file.type ว่าง) จึงดูนามสกุลแทน
  if (file.type === '' && VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'video'
  }
  return null
}
