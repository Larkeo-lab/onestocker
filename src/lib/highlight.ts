/*
  ไฮไลต์โค้ด HTML ไฟล์เดียว (มี <style> กับ <script> ข้างใน) ด้วย highlight.js

  โหลดเฉพาะแกนกับสามภาษาที่ใช้ และโหลดตอนเปิดดูโค้ดครั้งแรก (dynamic import) ไม่เพิ่มขนาดไฟล์หลักของแอป
  xml ไฮไลต์ CSS กับ JS ข้างใน <style>/<script> ให้เองเมื่อลงทะเบียน css และ javascript ไว้
  สีกำหนดใน index.css (.code-ide)
*/

let loading: Promise<(code: string) => string> | null = null

function load() {
  loading ??= Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/javascript'),
  ]).then(([{ default: hljs }, xml, css, javascript]) => {
    hljs.registerLanguage('xml', xml.default)
    hljs.registerLanguage('css', css.default)
    hljs.registerLanguage('javascript', javascript.default)
    return (code: string) => hljs.highlight(code, { language: 'xml', ignoreIllegals: true }).value
  })
  return loading
}

/** ตัวไฮไลต์แบบเรียกตรง ๆ หลังโหลดเสร็จ สำหรับ editor ที่ต้องลงสีใหม่ทุกครั้งที่พิมพ์ (ไม่ต้องรอ Promise ทุกตัวอักษร) */
export function loadHighlighter(): Promise<(code: string) => string> {
  return load()
}

/** คืน HTML ที่มี span สีของแต่ละส่วน ข้อความในโค้ดถูก escape แล้ว ใส่ลง innerHTML ได้ */
export async function highlightHtml(code: string): Promise<string> {
  const highlight = await load()
  return highlight(code)
}
