import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { NO_BACKGROUND_SCRIPT } from '@/lib/noBackground'
import { cn } from '@/lib/utils'

/**
 * ห้ามโค้ดโหลดอะไรจากภายนอก ชุดเดียวกับที่เซิร์ฟเวอร์ใส่ตอน render (sandboxHTML ใน render.go)
 * ตัวอย่างในหน้าเว็บจึงเห็นเหมือนวิดีโอที่ได้ ไม่ใช่ดูดีเพราะโหลดฟอนต์จาก CDN ได้
 */
const CSP_META =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
  `script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; ` +
  `font-src data:; media-src data: blob:; worker-src blob:">`

/** ใส่ CSP (และสคริปต์อื่นที่ต้องรันก่อนโค้ด) เป็นแท็กแรกใน <head> */
function withCsp(html: string, extra = ''): string {
  const head = /<head[^>]*>/i.exec(html)
  if (!head) return `<head>${CSP_META}${extra}</head>${html}`
  const end = head.index + head[0].length
  return html.slice(0, end) + CSP_META + extra + html.slice(end)
}

/**
 * บังคับพื้นหลังของหน้าให้โปร่งใส ชุดเดียวกับที่เครื่อง render ใส่ตอน render แบบ prores_alpha
 * (transparentCSS ใน workers-server/renderer/render/chrome.go) ต่อท้ายหน้าให้ชนะ style ของโค้ดเอง
 */
const TRANSPARENT_CSS = '<style>html,body,canvas{background:transparent!important}</style>'

/** ลายตารางหมากรุกแบบโปรแกรมแต่งภาพ บอกว่าส่วนไหนโปร่งใส */
const CHECKERBOARD: CSSProperties = {
  backgroundColor: '#fff',
  backgroundImage:
    'linear-gradient(45deg, #d4d4d4 25%, transparent 25%), linear-gradient(-45deg, #d4d4d4 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, #d4d4d4 75%), linear-gradient(-45deg, transparent 75%, #d4d4d4 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
}

/**
 * เล่นโค้ดที่ AI เขียนในกรอบ 16:9
 *
 * sandbox ให้รันสคริปต์ได้อย่างเดียว ไม่มี allow-same-origin
 * โค้ดจึงอ่าน cookie, localStorage หรือ token ล็อกอินของแอปไม่ได้
 *
 * colorScheme light ให้ตรงกับหน้าในกรอบ (โค้ดไม่ได้ตั้ง color-scheme) ตอนแอปเป็นธีมมืด
 * ถ้าไม่ตรงกัน เบราว์เซอร์วาดพื้นทึบรองไว้ใต้หน้า พื้นหลังโปร่งใสจึงไม่เห็นลายตาราง
 * และโค้ดที่ไม่มีพื้นหลังได้พื้นขาวแทนพื้นดำ
 *
 * transparent = แสดงแบบที่จะได้ใน MOV พื้นหลังโปร่งใส บนลายตาราง ส่วนที่ยังทึบคือโค้ดวาดพื้นเอง
 * (canvas หรือ div เต็มจอ) ซึ่งวิดีโอก็จะทึบเหมือนกัน
 *
 * iframe sandbox รันบนเธรดเดียวกับหน้าแอป โค้ดที่หนักทำให้ทั้งหน้ากระตุก
 * จึงเล่นเฉพาะตอนเห็นอยู่บนจอและแท็บเปิดอยู่ พ้นจอแล้วถอด iframe ออก (กลับมาเห็นเริ่มเล่นใหม่จากต้น)
 */
export function AnimationPreview({
  html,
  title,
  transparent = false,
  background = '',
}: {
  html: string
  title: string
  transparent?: boolean
  /** สีพื้นหลังที่บังคับทับของโค้ด '#rrggbb' แบบเดียวกับที่เครื่อง render ใส่ (BackgroundHTML) '' = ตามโค้ด */
  background?: string
}) {
  const srcDoc = useMemo(() => {
    // ตรวจรูปแบบก่อนต่อเข้า HTML ค่ามาจาก localStorage ได้
    const color = /^#[0-9a-f]{6}$/i.test(background) ? background : ''
    // พื้นหลังโปร่งใสหรือเลือกสีเอง: ลบพื้นที่โค้ดวาดเองบน canvas ด้วย เหมือนเครื่อง render (TransparentHTML / BackgroundHTML)
    const page = withCsp(html, transparent || color ? NO_BACKGROUND_SCRIPT : '')
    if (transparent) return page + TRANSPARENT_CSS
    if (color) return page + `<style>html,body{background:${color}!important}canvas{background:transparent!important}</style>`
    return page
  }, [html, transparent, background])
  const [box, visible] = useOnScreen()

  // กล่องนอกอยู่ตลอด observer จึงดูตัวเดียวกันไม่ว่าข้างในเป็น iframe หรือว่าง
  return (
    <div
      ref={box}
      style={transparent ? { ...CHECKERBOARD, colorScheme: 'light' } : { colorScheme: 'light' }}
      className={cn('aspect-video w-full overflow-hidden rounded-xl border border-border', !transparent && 'bg-black')}
    >
      {visible ? <iframe title={title} sandbox="allow-scripts" srcDoc={srcDoc} className="block size-full" /> : null}
    </div>
  )
}

/** อยู่ในจอ (หรือใกล้จะเลื่อนถึง) และแท็บเบราว์เซอร์เปิดอยู่ */
function useOnScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [intersecting, setIntersecting] = useState(true)
  const [shown, setShown] = useState(() => typeof document === 'undefined' || !document.hidden)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting), { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setShown(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  return [ref, intersecting && shown] as const
}
