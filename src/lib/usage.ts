import type { Usage } from "@/types/usage";

/** เปอร์เซ็นต์ที่ทำให้ตัวเลขเครดิตเปลี่ยนเป็นสีเตือน */
export const USAGE_WARN_PERCENT = 80;

export type UsageMeter = {
  /** null = ไม่จำกัด หรือยังไม่รู้ยอด */
  limit: number | null;
  /** 0–100 ใช้กับแถบ null เมื่อไม่มีเพดานให้เทียบ */
  percent: number | null;
  exhausted: boolean;
  /** ใช้ไปถึงเกณฑ์เตือนแล้วแต่ยังไม่หมด */
  warn: boolean;
};

/**
 * สรุปยอดเครดิตให้การ์ดใน dropdown กับป้ายบน header ใช้เกณฑ์สีเดียวกัน
 * ไม่งั้นป้ายอาจเป็นสีส้มขณะที่การ์ดยังเป็นสีปกติ
 */
export function usageMeter(usage: Usage | null): UsageMeter {
  const limit = usage?.limit ?? null;
  const percent =
    usage && limit !== null && limit > 0
      ? Math.min(100, Math.round((usage.used / limit) * 100))
      : null;
  const exhausted = usage !== null && limit !== null && usage.used >= limit;

  return {
    limit,
    percent,
    exhausted,
    warn: !exhausted && percent !== null && percent >= USAGE_WARN_PERCENT,
  };
}
