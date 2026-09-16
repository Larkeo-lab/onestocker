/**
 * จำนวนเครดิตที่ใช้ต่อหนึ่งครั้งของแต่ละงาน แอดมินตั้งได้จากหน้า Settings › ตั้งค่าเครดิต
 *
 * ต้องมีฟิลด์ตรงกับ CreditCosts ใน server/internal/feature/quota/dto.go
 */
export type CreditCosts = {
  /** สร้าง title และ keyword หนึ่งไฟล์ */
  generate: number
  /** ลบพื้นหลังหนึ่งรูป */
  removeBg: number
}
