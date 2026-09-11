/**
 * ค่าคอนฟิกจาก environment รวมไว้ที่เดียว
 * ห้ามอ่าน import.meta.env ตรง ๆ จากที่อื่น จะได้รู้ว่าแอปใช้ตัวแปรอะไรบ้าง
 */

const DEV_API_URL = "http://localhost:8080/api";

function readApiUrl(): string {
  const value = import.meta.env.VITE_API_URL?.trim();
  if (value) return value.replace(/\/+$/, "");

  // ตอน dev ยอมให้ลืมตั้งค่าได้ แต่ตอน build ต้องมีเสมอ
  // ไม่งั้นจะได้ไฟล์ที่ยิงไป localhost แล้วขึ้น production
  if (import.meta.env.DEV) {
    console.warn(`ไม่พบ VITE_API_URL จึงใช้ค่าเริ่มต้น ${DEV_API_URL}`);
    return DEV_API_URL;
  }
  throw new Error(
    "ไม่พบ VITE_API_URL ตอน build — ตั้งค่าก่อน build production",
  );
}
//

export const env = {
  apiUrl: readApiUrl(),
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
  isDev: import.meta.env.DEV,

  /**
   * ข้ามหน้าล็อกอินตอนพัฒนา แล้วเข้าแอปตรง ๆ
   *
   * มีไว้เพราะคีย์ Clerk แบบ production ผูกกับโดเมนจริง เปิดจาก
   * localhost แล้ว Clerk จะตอบ 400 (Invalid HTTP Origin header)
   * ทำให้หน้าเว็บค้างอยู่ที่หน้าว่าง
   *
   * ผูกกับ import.meta.env.DEV ไว้ด้วย ไฟล์ที่ build ออกไปจึงข้าม
   * การล็อกอินไม่ได้เลย ต่อให้ตั้งตัวแปรผิด
   *
   * ฝั่ง Go ต้องตั้ง AUTH_DEV_BYPASS=true คู่กัน ไม่งั้นจะโดน 401
   */
  authDevBypass:
    import.meta.env.DEV && import.meta.env.VITE_AUTH_DEV_BYPASS === "true",
} as const;
