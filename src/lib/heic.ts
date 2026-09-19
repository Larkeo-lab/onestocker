/*
  รูป HEIC จาก iPhone

  เบราว์เซอร์ส่วนใหญ่ (ยกเว้น Safari) แสดง HEIC ไม่ได้ และเซิร์ฟเวอร์ก็อ่านไม่ได้
  จึงแปลงเป็น JPEG บนเครื่องผู้ใช้ก่อนอัป ที่เหลือทำงานเหมือนรูป JPG ปกติ
*/

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']
const HEIC_EXTENSION = /\.(heic|heif)$/i

/** ใส่ใน accept ของช่องเลือกไฟล์ ต้องมีนามสกุลด้วย เพราะ Windows มักไม่รู้จักชนิด HEIC */
export const HEIC_ACCEPT = ['image/heic', 'image/heif', '.heic', '.heif']

/** คุณภาพ JPEG ที่แปลงออกมา สูงพอให้ขอบตอนลบพื้นหลังไม่มีรอยบีบอัด */
const JPEG_QUALITY = 0.92

/** แปลง HEIC พร้อมกันกี่ไฟล์ ถอดรหัสรูปเต็มในแท็บ ทำทีละไฟล์ไม่ให้เครื่องผู้ใช้ค้าง */
export const HEIC_CONVERT_CONCURRENCY = 1

/** ดูจากชนิดไฟล์หรือนามสกุล บาง OS ส่งชนิดมาเป็นค่าว่าง */
export function isHeicFile(file: File): boolean {
  return HEIC_TYPES.includes(file.type) || HEIC_EXTENSION.test(file.name)
}

/**
 * แปลง HEIC เป็น JPEG ชื่อไฟล์เปลี่ยนนามสกุลเป็น .jpg
 * ตัวแปลง (libheif แบบ WebAssembly) ใหญ่ราว 3 MB จึงโหลดเฉพาะตอนมีไฟล์ HEIC จริง
 */
export async function heicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import('heic-to')
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: JPEG_QUALITY })
  const name = `${file.name.replace(HEIC_EXTENSION, '') || 'image'}.jpg`
  return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
}
