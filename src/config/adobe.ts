/**
 * หมวดหมู่ของ Adobe Stock
 *
 * ลำดับในรายการนี้ตรงกับเลขในคอลัมน์ Category ของไฟล์ CSV (เริ่มที่ 1)
 * ต้องตรงกับ AdobeCategories ฝั่ง Go (internal/feature/generate/category.go)
 * เพราะโมเดลถูกบังคับให้ตอบชื่อจากรายการนั้น แล้วที่นี่แปลงเป็นเลข
 */
export const ADOBE_CATEGORIES = [
  'Animals',
  'Buildings and Architecture',
  'Business',
  'Drinks',
  'The Environment',
  'States of Mind',
  'Food',
  'Graphic Resources',
  'Hobbies and Leisure',
  'Industry',
  'Landscape',
  'Lifestyle',
  'People',
  'Plants and Flowers',
  'Culture and Religion',
  'Science',
  'Social Issues',
  'Sports',
  'Technology',
  'Transport',
  'Travel',
] as const

/**
 * แปลงชื่อหมวดเป็นเลขที่ Adobe ใช้ในไฟล์ CSV
 * คืนค่าว่างเมื่อไม่รู้จัก — ปล่อยช่องว่างไว้ดีกว่าใส่เลขมั่ว
 * เพราะใส่ผิดหมวดทำให้ภาพไปโผล่ผิดที่และถูกปฏิเสธได้
 */
export function adobeCategoryNumber(category: string): string {
  const index = ADOBE_CATEGORIES.indexOf(
    category as (typeof ADOBE_CATEGORIES)[number],
  )
  return index === -1 ? '' : String(index + 1)
}
