/**
 * สร้างไฟล์ CSV ของ metadata เพื่ออัปขึ้นแพลตฟอร์มสต็อก
 *
 * ทำฝั่งเบราว์เซอร์ทั้งหมด ไม่ต้องยิงไปเซิร์ฟเวอร์ เพราะข้อมูลที่ต้องใช้
 * อยู่ในหน้าจออยู่แล้ว — กดแล้วได้ไฟล์ทันที ไม่เสียเวลารอและไม่เปลืองแบนด์วิดท์
 */

/**
 * ห่อค่าหนึ่งช่องตามกฎของ CSV (RFC 4180)
 *
 * ต้องห่อด้วยเครื่องหมายคำพูดเมื่อมีจุลภาค บรรทัดใหม่ หรือเครื่องหมายคำพูด
 * ไม่งั้นคอลัมน์จะเลื่อน — ซึ่งเกิดง่ายมากเพราะ keywords คั่นด้วยจุลภาคอยู่แล้ว
 * และ title ที่โมเดลเขียนก็มีจุลภาคเป็นเรื่องปกติ
 *
 * เครื่องหมายคำพูดข้างในต้องเขียนซ้ำสองตัว ไม่ใช่ใส่ backslash
 */
function escapeCell(value: string): string {
  const clean = value.replace(/\r?\n/g, ' ').trim()
  if (!/[",]/.test(clean)) return clean
  return `"${clean.replace(/"/g, '""')}"`
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))

  // ปิดท้ายด้วยบรรทัดใหม่ โปรแกรมตารางบางตัวกินบรรทัดสุดท้ายหายถ้าไม่มี
  return lines.join('\r\n') + '\r\n'
}

/**
 * สั่งให้เบราว์เซอร์บันทึกไฟล์
 *
 * ใส่ BOM ไว้ข้างหน้าเพราะ Excel บน Windows อ่านไฟล์ UTF-8 ที่ไม่มี BOM
 * เป็นภาษาท้องถิ่น ทำให้ภาษาไทยและลาวกลายเป็นตัวยึกยือ
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // คืนหน่วยความจำหลังเบราว์เซอร์เริ่มดาวน์โหลดแล้ว
  // เรียกทันทีบางเบราว์เซอร์จะยกเลิกการดาวน์โหลดไปเลย
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
