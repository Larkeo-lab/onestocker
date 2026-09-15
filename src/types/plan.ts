import type { UserType } from './profile'

/** ข้อความหนึ่งชุดแยกภาษา ภาษาที่เว้นว่างให้ใช้ภาษาไทยแทน (ดู localizedText) */
export type LocalizedText = {
  th: string
  en: string
  lo: string
}

export type PlanFeature = {
  title: LocalizedText
  /** บรรทัดรองใต้หัวข้อ เว้นว่างได้ */
  description: LocalizedText
}

/**
 * แพ็กเกจหนึ่งระดับในป๊อปอัปอัปเกรด
 *
 * ต้องมีฟิลด์ตรงกับ Plan ใน server/internal/feature/quota/dto.go
 * คำอธิบายกับจุดเด่นเป็นแค่ข้อความโฆษณาที่แอดมินพิมพ์ ระบบไม่ได้บังคับตามที่เขียน
 */
export type Plan = {
  userType: UserType
  /**
   * FREE: เครดิตฟรีครั้งเดียวตลอดชีพ
   * PLUS / PRO / ULTRA: เครดิตต่อการเติมหนึ่งครั้ง ใช้ได้ 30 วัน
   * null = ไม่จำกัด
   */
  monthlyLimit: number | null
  /** ดอลลาร์สหรัฐต่อการเติมหนึ่งครั้ง ($5 = 5) null = ยังไม่ได้ตั้งราคา ต่างจาก 0 ที่แปลว่าฟรี */
  monthlyPrice: number | null
  description: LocalizedText
  /** เรียงตามลำดับที่แสดง */
  features: PlanFeature[]
  /** มีได้ทีละระดับ */
  recommended: boolean
}
