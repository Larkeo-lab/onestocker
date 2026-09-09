/**
 * ความกว้างคอนเทนเนอร์ของแต่ละหน้า
 * PageHeader และเนื้อหาต้องใช้ค่าเดียวกัน หัวข้อกับเนื้อหาถึงจะอยู่แนวเดียวกัน
 *
 * อยู่แยกจาก PageHeader.tsx เพราะไฟล์คอมโพเนนต์ที่ export ค่าอื่นด้วย
 * จะทำให้ fast refresh ตอน dev ใช้ไม่ได้
 */
export const CONTAINER = {
  wide: 'mx-auto w-full max-w-6xl px-5 sm:px-6',
  narrow: 'mx-auto w-full max-w-4xl px-5 sm:px-6',
} as const

export type ContainerWidth = keyof typeof CONTAINER
