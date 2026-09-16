import { useTranslation } from "react-i18next";

import { intlLocale } from "@/config/i18n";
import { usageMeter } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { useUsageStore } from "@/store/usage";

function formatExpiryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(), {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * เครดิตที่ใช้ไป เทียบกับเครดิตทั้งหมดของก้อนที่มีผล (ฟรีตลอดชีพ หรือรอบเสียเงิน 30 วัน)
 *
 * อ่านจาก store ตรง ๆ ไม่รับเป็น prop เพราะตัวที่ทำให้ตัวเลขขยับคือ
 * GenerateProvider ซึ่งอยู่คนละกิ่งของต้นไม้ ไม่ได้เป็นพ่อของ header
 *
 * ยังไม่รู้ยอดก็แสดงขีดไว้ ดีกว่าโชว์ 0 ให้เข้าใจผิดว่ายังไม่ได้ใช้เลย
 */
export function UsageCard() {
  const { t } = useTranslation();
  const usage = useUsageStore((state) => state.usage);
  const { limit, percent, exhausted, low, warn } = usageMeter(usage);

  const countTone =
    exhausted || low
      ? "text-danger"
      : warn
        ? "text-warning"
        : "text-subtle-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("account.credits")}
        </span>
        <span className={cn("shrink-0 font-mono text-[11px]", countTone)}>
          {!usage
            ? "—"
            : limit === null
              ? t("account.unlimited", { used: usage.used })
              : `${usage.used}/${limit}`}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        {percent !== null ? (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              exhausted || low ? "bg-danger" : warn ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        ) : null}
      </div>

      {usage ? (
        <p className="mt-1.5 truncate text-[10px] text-subtle-foreground">
          {usage.userType}
          {" · "}
          {usage.expiresAt
            ? t("account.expires", { date: formatExpiryDate(usage.expiresAt) })
            : t("account.freeForever")}
        </p>
      ) : null}
    </div>
  );
}
