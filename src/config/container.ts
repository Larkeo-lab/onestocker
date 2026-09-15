/**
 * ความกว้างคอนเทนเนอร์ของแต่ละหน้า
 * หัวข้อของหน้าอยู่ในคอนเทนเนอร์เดียวกับเนื้อหา จึงอยู่แนวเดียวกันเสมอ
 *
 * อยู่แยกเป็นไฟล์ค่าคงที่ เพราะไฟล์คอมโพเนนต์ที่ export ค่าอื่นด้วย
 * จะทำให้ fast refresh ตอน dev ใช้ไม่ได้
 */
export const CONTAINER = {
  wide: 'mx-auto w-full max-w-6xl px-5 sm:px-6',
  narrow: 'mx-auto w-full max-w-4xl px-5 sm:px-6',
} as const

export type ContainerWidth = keyof typeof CONTAINER
