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
  /** "true" = ข้ามหน้าล็อกอินตอน dev (ดู lib/env.ts) */
  readonly VITE_AUTH_DEV_BYPASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** เลขเวอร์ชันจาก package.json ใส่มาตอน build (ดู define ใน vite.config.ts) */
declare const __APP_VERSION__: string
/** git commit แบบสั้นที่ใช้ build ว่างได้ถ้า build นอก git */
declare const __APP_COMMIT__: string
