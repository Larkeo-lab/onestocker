/**
 * ช่องทางติดต่อของร้าน แอดมินเป็นคนกรอกจากหน้า one-stock-admin
 *
 * ต้องมีฟิลด์ตรงกับ Channels ใน server/internal/feature/contact/dto.go
 * ค่าว่างแปลว่ายังไม่ได้ตั้ง ต้องไม่แสดงปุ่มของช่องทางนั้น
 * ไม่งั้นผู้ใช้จะกดแล้วไปไหนไม่ได้
 */
export type ContactChannels = {
  /** ตัวเลขล้วนแบบ E.164 เช่น 8562012345678 */
  whatsapp: string
  facebook: string
  gmail: string
  tiktok: string
  /** ISO 8601 */
  updatedAt: string
}

export type ContactChannelKey = 'whatsapp' | 'facebook' | 'gmail' | 'tiktok'
