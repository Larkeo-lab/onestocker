/**
 * ค่าคงที่ระดับแอป แก้ที่นี่ที่เดียวแล้วใช้ร่วมกันทั้ง UI และ title ของหน้า
 */
export const siteConfig = {
  name: "Onestocks",
  description: "AI-powered metadata generator for stock contributors",

  /**
   * โดเมนจริงของเว็บ ไม่มี / ปิดท้าย
   *
   * ใช้สร้าง canonical, og:url, robots.txt และ sitemap.xml ตอน build
   * (ดู scripts/prerender.mjs) ย้ายโดเมนเมื่อไรแก้ที่นี่ที่เดียว
   */
  url: "https://stockphoto-metadata.eezypos.com",

  /**
   * ข้อมูลที่ Google กับตัวทำพรีวิวลิงก์ (Facebook, LINE) จะเห็น
   *
   * title กับ description แยกตามภาษา อยู่ที่ landing.seo ใน config/messages/<ภาษา>.json
   * ใส่คำที่คนค้นจริง — "Adobe Stock", "keywords", "title" — ไม่ใช่แค่ชื่อแบรนด์
   * เพราะยังไม่มีใครรู้จักชื่อ Onestocks จึงไม่มีใครพิมพ์ชื่อนี้ค้น
   * title ไม่ควรเกิน ~60 ตัวอักษร description ไม่ควรเกิน ~155 ไม่งั้นโดนตัด
   */
  seo: {
    /** รูปตอนแชร์ลิงก์ ขนาด 1200×630 อยู่ใน public/ ใช้รูปเดียวทุกภาษา */
    image: "/og.png",
  },
} as const;

/** path ของตัวแอปที่ต้องล็อกอิน หน้า / เป็นหน้า landing สาธารณะ */
export const APP_PATH = "/app";

/**
 * ค่าสำรองระหว่างรอคำตอบจาก GET /meta
 *
 * ค่าจริงเซิร์ฟเวอร์เป็นเจ้าของ ตัวเลขนี้ใช้แค่ตอนหน้าเว็บเพิ่งเปิด
 * หรือตอนต่อ API ไม่ติด จะได้ยังกดใช้งานได้ไม่ค้าง
 */
export const FALLBACK_MAX_ASSETS = 30;

/** ยิง generate พร้อมกันกี่รูป มากเกินไปจะไปชนลิมิตของ Gemini */
export const GENERATE_CONCURRENCY = 3;

/** อัปขึ้น R2 พร้อมกันกี่ไฟล์ */
export const UPLOAD_CONCURRENCY = 4;

export type SiteConfig = typeof siteConfig;
