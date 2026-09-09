/** หนึ่งแถวในประวัติการสร้าง metadata */
export type Generation = {
  id: string
  filename: string
  previewKey: string | null
  title: string
  description: string
  keywords: string[]
  category: string | null
  provider: string | null
  model: string | null
  createdAt: string
}

/** ประวัติหนึ่งแถว พร้อมลิงก์รูปย่อชั่วคราวสำหรับแสดงผล */
export type GenerationWithPreview = Generation & {
  previewUrl: string | null
}
