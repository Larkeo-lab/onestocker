import './index.css'

import { landingLanguageFromPath } from '@/config/languages'

/*
  หน้า /, /th, /lo คือหน้า landing สาธารณะ (หนึ่งหน้าต่อภาษา) ทุก path อื่นคือตัวแอป

  ตอน build หน้า landing ถูกเขียนลง HTML นิ่งแล้ว (scripts/prerender.mjs)
  บนเว็บจริงหน้าแรกจึงไม่ต้องรัน JavaScript อะไรเลย
  Google กับตัวทำพรีวิวลิงก์ที่ไม่รัน JavaScript ก็เห็นเนื้อหาครบ

  ตัวแอปโหลดด้วย import() แยกเป็นอีกก้อน คนที่เปิดแค่หน้าแรกจะไม่ต้อง
  โหลด Clerk, i18next กับโค้ดทั้งแอปมาด้วย หน้าแรกจึงขึ้นเร็ว
*/
const landingLanguage = landingLanguageFromPath(window.location.pathname)

if (landingLanguage) {
  const landing = document.getElementById('landing')

  // มีเนื้อหาอยู่แล้วแปลว่ามาจากไฟล์ที่ build ไว้ ไม่ต้องวาดใหม่
  // ว่างอยู่แปลว่ากำลังรัน vite dev ซึ่งไม่ได้ prerender จึงวาดด้วย React แทน
  const mounted =
    landing && !landing.firstElementChild
      ? import('./landing/mount').then(({ mountLanding }) =>
          mountLanding(landing, landingLanguage),
        )
      : Promise.resolve()

  // เติมจำนวนเครดิตฟรีลงปุ่มสมัครหลังหน้าวาดเสร็จ — แยกเป็นก้อนเล็กของตัวเอง
  // คนที่เปิดหน้าแรกจะได้ไม่ต้องโหลดอะไรเพิ่มนอกจากคำขอเดียวนี้
  void mounted
    .then(() => import('./landing/freeCredits'))
    .then(({ showFreeCredits }) => showFreeCredits())

  // การ์ดแพ็กเกจในส่วนราคา ดึงจากเซิร์ฟเวอร์เหมือนกัน
  void mounted
    .then(() => import('./landing/plans'))
    .then(({ showPlans }) => showPlans())
} else {
  void import('./bootstrap')
}
