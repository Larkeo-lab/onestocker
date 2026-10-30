import { useMemo } from 'react'

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
 * เล่นโค้ดที่ AI เขียนในกรอบ 16:9
 *
 * sandbox ให้รันสคริปต์ได้อย่างเดียว ไม่มี allow-same-origin
 * โค้ดจึงอ่าน cookie, localStorage หรือ token ล็อกอินของแอปไม่ได้
 */
export function AnimationPreview({ html, title }: { html: string; title: string }) {
  const srcDoc = useMemo(() => withCsp(html), [html])
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="aspect-video w-full rounded-xl border border-border bg-black"
    />
  )
}
