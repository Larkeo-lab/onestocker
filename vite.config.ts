import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
