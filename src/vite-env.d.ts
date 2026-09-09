/// <reference types="vite/client" />

/**
 * ตัวแปรที่อ่านได้จาก import.meta.env
 * ต้องขึ้นต้นด้วย VITE_ เท่านั้น Vite ถึงจะใส่มาให้ฝั่ง client
 *
 * เตือน: ทุกค่าที่นี่ถูกฝังลงไฟล์ JS ที่ผู้ใช้โหลดได้ ห้ามใส่ secret
 */
interface ImportMetaEnv {
  /** base URL ของ Go API เช่น http://localhost:8080/api */
  readonly VITE_API_URL: string
  /** publishable key ของ Clerk (เป็น public โดยตั้งใจ) */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
