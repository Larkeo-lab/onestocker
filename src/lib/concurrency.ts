/**
 * รันงาน async ทีละ N ตัวพร้อมกัน
 *
 * ใช้แทนการ Promise.all ทั้งก้อน เพราะอัปโหลดหรือเรียกโมเดลพร้อมกัน
 * ทีเดียว 30 รูปจะไปชนลิมิตของปลายทาง และทำให้แท็บหน่วง
 */
export async function runWithConcurrency(
  tasks: (() => Promise<void>)[],
  limit = 4,
): Promise<void> {
  let cursor = 0

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (cursor < tasks.length) {
        const index = cursor
        cursor += 1
        await tasks[index]()
      }
    },
  )

  await Promise.all(workers)
}
