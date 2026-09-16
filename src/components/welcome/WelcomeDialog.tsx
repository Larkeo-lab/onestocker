import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { intlLocale } from "@/config/i18n";
import { dismissWelcome } from "@/lib/api/auth";
import { queryClient, queryKeys } from "@/lib/query";
import { useUsageStore } from "@/store/usage";
import type { Profile } from "@/types/profile";
import type { Usage } from "@/types/usage";

/**
 * popup ต้อนรับผู้ใช้ใหม่ บอกเครดิตฟรี (ครั้งเดียว ไม่รีเซ็ต) ตามที่แอดมินตั้งไว้ในหน้า Quota
 *
 * เซิร์ฟเวอร์เป็นคนตัดสินว่าใครควรเห็น (showWelcome จาก /auth/me) ผู้ใช้เก่า
 * ถูกนับว่าเห็นแล้วตั้งแต่เปิดฟีเจอร์ และกดปิดครั้งเดียวจะไม่เห็นอีกทุกเครื่อง
 *
 * จำนวนเครดิตอ่านจาก /usage ไม่ได้เขียนตายตัว เพราะแอดมินแก้ได้ตลอด
 * ยังโหลดยอดไม่ได้ก็ยังไม่แสดง ดีกว่าแสดงตัวเลขผิด แล้วจะได้เห็นครั้งถัดไป
 */
export function WelcomeDialog({ show }: { show: boolean }) {
  const usage = useUsageStore((state) => state.usage);
  const quotaDialogOpen = useUsageStore((state) => state.limitReached);
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed || !usage) return null;
  // ไม่ซ้อนกับ popup โควตาหมด
  if (quotaDialogOpen) return null;
  // แอดมินปิดเครดิตฟรีไว้ (เพดานศูนย์) — "ฟรี 0 เครดิต" ไม่ใช่คำต้อนรับ
  // ไม่บันทึกว่าเห็นแล้ว ถ้าแอดมินเปิดเครดิตทีหลัง ผู้ใช้จะยังได้เห็น
  if (usage.limit === 0) return null;

  function onDismiss() {
    setDismissed(true);
    /*
      ปิดบนจอทันที ไม่รอเซิร์ฟเวอร์ตอบ

      ถ้าบันทึกไม่สำเร็จ ผลเสียมีแค่ผู้ใช้เห็น popup อีกครั้งตอนเปิดแอปครั้งหน้า
      ไม่คุ้มที่จะให้เขาต้องกดปิดแล้วรอ หรือเห็นข้อความ error
    */
    void dismissWelcome().catch(() => undefined);
    // โปรไฟล์ใน cache ไม่หมดอายุ ถ้าไม่แก้ตรงนี้ป๊อปอัปจะกลับมาตอน AppShell ถูกสร้างใหม่
    queryClient.setQueryData<Profile>(queryKeys.me, (profile) =>
      profile ? { ...profile, showWelcome: false } : profile,
    );
  }

  return <WelcomeDialogContent usage={usage} onDismiss={onDismiss} />;
}

function WelcomeDialogContent({
  usage,
  onDismiss,
}: {
  usage: Usage;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  // ปิดด้วย Escape ตามที่คนคาดหวังจากกล่องแบบนี้
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  const unlimited = usage.limit === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      // คลิกพื้นหลังเพื่อปิด แต่คลิกในกล่องต้องไม่ปิด
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        aria-describedby="welcome-dialog-credits"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-xl"
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.close")}
          className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>

        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft">
          <Sparkles className="size-6 text-primary" aria-hidden />
        </span>

        <h2
          id="welcome-dialog-title"
          className="mt-4 text-[17px] font-semibold tracking-tight"
        >
          {t("welcome.title")}
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {t("welcome.subtitle", { plan: usage.userType })}
        </p>

        <div
          id="welcome-dialog-credits"
          className="mt-5 rounded-lg border border-primary/25 bg-primary-soft px-4 py-4"
        >
          <p className="text-[34px] leading-none font-semibold tracking-tight text-primary tabular-nums">
            {unlimited
              ? t("welcome.unlimited")
              : (usage.limit ?? 0).toLocaleString(intlLocale())}
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-foreground">
            {unlimited
              ? t("welcome.unlimitedLabel")
              : t("welcome.creditsLabel")}
          </p>
        </div>

        <Button
          variant="primary"
          className="mt-5 w-full"
          onClick={onDismiss}
          autoFocus
        >
          {t("welcome.start")}
        </Button>
      </div>
    </div>
  );
}
