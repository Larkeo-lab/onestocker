import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// เลขเวอร์ชันแก้ที่ "version" ใน package.json ที่เดียว
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

// commit ที่ build ไว้บอกว่าเว็บที่เปิดอยู่มาจากโค้ดชุดไหน เลขเวอร์ชันเดียวกันอาจ deploy หลายรอบ
// build นอก git (เช่นโฟลเดอร์ที่คัดลอกมา) ไม่มีค่านี้ ก็แสดงแค่เลขเวอร์ชัน
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(gitCommit()),
  },
  resolve: {
    // "@/lib/api" -> "src/lib/api" ต้องประกาศคู่กับ paths ใน tsconfig.app.json
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // ถ้าพอร์ตถูกใช้อยู่ ให้หยุดไปเลย อย่าเลื่อนไป 5174 เอง
    //
    // เพราะ ALLOWED_ORIGINS ฝั่ง Go และ CORS policy ของ R2 ระบุ 5173 ไว้
    // พอ vite เลื่อนพอร์ตเงียบ ๆ ทุกคำขอจะโดน CORS บล็อกโดยไม่มีอะไรบอกว่าทำไม
    strictPort: true,
  },
})
