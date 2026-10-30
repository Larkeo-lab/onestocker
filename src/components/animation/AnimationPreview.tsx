import { useMemo, type CSSProperties } from 'react'

import { cn } from '@/lib/utils'

/**
 * ห้ามโค้ดโหลดอะไรจากภายนอก ชุดเดียวกับที่เซิร์ฟเวอร์ใส่ตอน render (sandboxHTML ใน render.go)
 * ตัวอย่างในหน้าเว็บจึงเห็นเหมือนวิดีโอที่ได้ ไม่ใช่ดูดีเพราะโหลดฟอนต์จาก CDN ได้
 */
const CSP_META =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
  `script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; ` +
  `font-src data:; media-src data: blob:; worker-src blob:">`

function withCsp(html: string): string {
  const head = /<head[^>]*>/i.exec(html)
  if (!head) return `<head>${CSP_META}</head>${html}`
  const end = head.index + head[0].length
  return html.slice(0, end) + CSP_META + html.slice(end)
}

/**
 * บังคับพื้นหลังของหน้าให้โปร่งใส ชุดเดียวกับที่เครื่อง render ใส่ตอน render แบบ prores_alpha
 * (transparentCSS ใน workers-server/renderer/render/chrome.go) ต่อท้ายหน้าให้ชนะ style ของโค้ดเอง
 */
const TRANSPARENT_CSS = '<style>html,body{background:transparent!important}</style>'

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
 * transparent = แสดงแบบที่จะได้ใน MOV พื้นหลังโปร่งใส บนลายตาราง ส่วนที่ยังทึบคือโค้ดวาดพื้นเอง
 * (canvas หรือ div เต็มจอ) ซึ่งวิดีโอก็จะทึบเหมือนกัน
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
    const page = withCsp(html)
    if (transparent) return page + TRANSPARENT_CSS
    // ตรวจรูปแบบก่อนต่อเข้า HTML ค่ามาจาก localStorage ได้
    if (/^#[0-9a-f]{6}$/i.test(background)) return page + `<style>html,body{background:${background}!important}</style>`
    return page
  }, [html, transparent, background])
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      style={transparent ? CHECKERBOARD : undefined}
      className={cn('aspect-video w-full rounded-xl border border-border', !transparent && 'bg-black')}
    />
  )
}
