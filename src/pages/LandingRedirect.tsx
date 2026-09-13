import { useEffect } from 'react'

/**
 * รับตกกรณีที่ react-router ถูกพามาที่ / โดยไม่ได้โหลดหน้าใหม่
 *
 * หน้า / เป็น HTML นิ่งที่ main.tsx ไม่ได้เปิดตัวแอปทับ ต้องโหลดใหม่ทั้งหน้า
 * ถึงจะเห็นหน้า landing — ถ้าไม่มีตัวนี้ จะตกไปที่หน้า 404 ของแอปแทน
 * ไม่วนซ้ำ เพราะพอโหลดใหม่ที่ / แล้ว main.tsx จะไม่เปิดตัวแอปอีก
 */
export function LandingRedirect() {
  useEffect(() => {
    window.location.replace('/')
  }, [])
  return null
}
