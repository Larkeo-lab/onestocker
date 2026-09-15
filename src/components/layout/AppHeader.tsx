import { PanelLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import { useUsageStore } from "@/store/usage";
import type { Profile } from "@/types/profile";

import { ProfileMenu } from "./ProfileMenu";

/**
 * แถบบนสุดของทุกหน้าที่ต้องล็อกอิน อยู่ทางขวาของ sidebar ติดบนตลอดเวลาเลื่อน
 *
 * สูง h-14 เท่ากับแถบโลโก้ใน sidebar เส้นขอบล่างจึงต่อกันเป็นเส้นเดียว
 * หัวข้อของแต่ละหน้าอยู่ในเนื้อหาของหน้านั้นเอง เลื่อนหายไปพร้อมเนื้อหา
 */
export function AppHeader({
  profile,
  onOpenNavigation,
}: {
  profile: Profile | null;
  onOpenNavigation: () => void;
}) {
  const { t } = useTranslation();
  const openPlans = useUsageStore((state) => state.openPlans);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      {/* จอเล็กไม่มี sidebar ปุ่มเปิดเมนูกับโลโก้จึงมาอยู่ที่นี่ */}
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onOpenNavigation}
          aria-label={t("nav.openNavigation")}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <PanelLeft className="size-4" aria-hidden />
        </button>
        <span className="flex min-w-0 items-center gap-2">
          <img
            src="/logo/mark.png"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain"
          />
          <span className="hidden truncate text-[13px] font-semibold tracking-tight min-[420px]:block">
            {siteConfig.name}
          </span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/*
          กดแล้วเปิดป๊อปอัปเลือกแพ็กเกจ (PlansDialog) เลือกแล้วไปขั้นช่องทางติดต่อ เพราะยังไม่มีระบบจ่ายเงิน
          จอเล็กเหลือแค่ไอคอน ชื่อปุ่มจึงต้องมาทาง aria-label
        */}
        <Button
          variant="primary"
          size="sm"
          onClick={openPlans}
          aria-label={t("account.upgrade")}
          title={t("plans.title")}
        >
          <Sparkles className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{t("account.upgrade")}</span>
        </Button>

        <ProfileMenu profile={profile} />
      </div>
    </header>
  );
}
