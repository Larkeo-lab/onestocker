import { Lock, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PAID_GRADIENT } from "@/lib/plans";
import { enabledQualities, qualityLocked, requiredPlan } from "@/lib/removeBg";
import { cn } from "@/lib/utils";
import { useUsageStore } from "@/store/usage";
import type { CreditCosts } from "@/types/creditCost";
import { QUALITY_FEATURE, type RemoveBgQuality } from "@/types/removeBg";

export function QualityPicker({
  costs,
  value,
  onChange,
}: {
  costs: CreditCosts;
  value: RemoveBgQuality;
  onChange: (quality: RemoveBgQuality) => void;
}) {
  const { t } = useTranslation();
  const userType = useUsageStore((state) => state.usage?.userType);
  const openPlans = useUsageStore((state) => state.openPlans);

  const info: Record<RemoveBgQuality, { label: string; icon: LucideIcon }> = {
    standard: { label: t("removeBg.qualityStandard"), icon: Zap },
    hd: { label: t("removeBg.qualityHd"), icon: Sparkles },
  };

  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-medium text-muted-foreground">
        {t("removeBg.qualityLabel")}
      </legend>

      {/* เผื่อที่ด้านบนให้ป้ายที่คร่อมขอบการ์ด */}
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        {enabledQualities(costs).map((quality) => {
          const selected = quality === value;
          const { label, icon: Icon } = info[quality];
          const credits = costs[QUALITY_FEATURE[quality]];
          const plan = requiredPlan(costs, quality);
          const locked = qualityLocked(costs, quality, userType);

          const body = (
            <>
              <input
                type="radio"
                name="remove-bg-quality"
                value={quality}
                checked={selected}
                // ยังไม่ถึงแพ็กเกจ ไม่เลือกระดับนี้ เปิดป๊อปอัปแพ็กเกจให้อัปเกรดแทน
                onChange={() => (locked ? openPlans() : onChange(quality))}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md",
                  selected
                    ? "bg-primary-soft text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      selected && "text-primary",
                    )}
                  >
                    {label}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-muted-foreground tabular-nums">
                    {t("removeBg.costPerImage", { count: credits })}
                  </span>
                </span>
                {locked ? (
                  <span className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-primary">
                    <Lock className="size-3 shrink-0" aria-hidden />
                    {t("removeBg.upgradeToUse", { plan })}
                  </span>
                ) : null}
              </span>
            </>
          );

          if (!locked || !plan) {
            return (
              <label
                key={quality}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 transition-colors",
                  "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40",
                  selected
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-border-strong",
                )}
              >
                {body}
              </label>
            );
          }

          return (
            <div key={quality} className="relative">
              {/* แสงเรืองด้านหลัง ชุดสีเดียวกับวงแหวนรูปโปรไฟล์ของแพ็กเกจเสียเงิน */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -inset-1 rounded-2xl opacity-40 blur-[8px] motion-safe:animate-pulse",
                  PAID_GRADIENT,
                )}
              />
              {/* ขอบไล่เฉด: ชั้นนอกเป็นสีไล่ ชั้นในเป็นพื้นการ์ด เว้นขอบไว้ 1.5px */}
              <label
                className={cn(
                  "relative block cursor-pointer rounded-xl p-[1.5px]",
                  "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40",
                  PAID_GRADIENT,
                )}
              >
                <span className="flex items-center gap-3 rounded-[10.5px] bg-card p-3">
                  {body}
                </span>
              </label>
              {/* ป้ายแพ็กเกจคร่อมขอบด้านบน */}
              <span
                className={cn(
                  "pointer-events-none absolute -top-2.5 left-3 flex items-center gap-1 rounded-full px-2 py-0.5",
                  "text-[10.5px] font-semibold tracking-wide text-white shadow-sm",
                  PAID_GRADIENT,
                )}
              >
                <Lock className="size-2.5" aria-hidden />
                {t("removeBg.planBadge", { plan })}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
