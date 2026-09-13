import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import type { AppLanguage } from '@/config/languages'

import { LandingPage } from './LandingPage'

/**
 * วาดหน้า landing ด้วย React ตอนรัน `vite dev`
 *
 * ตอน build หน้านี้ถูกเขียนลง index.html (และ th.html, lo.html) เป็น HTML นิ่งไว้แล้ว
 * ฟังก์ชันนี้จึงไม่ถูกเรียกบนเว็บจริง มีไว้ให้แก้หน้า landing แล้วเห็นผลทันทีบนเครื่อง
 */
export function mountLanding(container: HTMLElement, language: AppLanguage): void {
  // บนเว็บจริง prerender ใส่ lang ให้แต่ละไฟล์ ตอน dev ต้องตั้งเอง
  document.documentElement.lang = language

  createRoot(container).render(
    <StrictMode>
      <LandingPage language={language} />
    </StrictMode>,
  )
}
