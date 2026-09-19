import { ArrowLeft, Check, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ContactChannelList } from "@/components/quota/ContactChannelList";
import { ErrorState, Loading } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { currentLanguage, intlLocale } from "@/config/i18n";
import { APP_PATH } from "@/config/site";
import { useCreditCosts, usePlans } from "@/hooks/queries";
import { errorMessage } from "@/lib/error";
import { formatUsd } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useUsageStore } from "@/store/usage";
import type { UserType } from "@/types/profile";
import type { LocalizedText, Plan } from "@/types/plan";

/** ข้อความตามภาษาที่เลือก ภาษาที่แอดมินเว้นว่างใช้ภาษาไทยแทน */
function localizedText(text: LocalizedText | undefined): string {
  if (!text) return "";
  return text[currentLanguage()]?.trim() || text.th.trim();
}

/**
 * ป๊อปอัปเลือกแพ็กเกจ เปิดจากปุ่ม Upgrade บน header
 *
 * กดเลือกแพ็กเกจที่ตั้งราคาแล้ว ปิดป๊อปอัปแล้วไปหน้าชำระเงิน (/app/checkout/:plan)
 * แพ็กเกจที่ยังไม่ตั้งราคาจ่ายออนไลน์ไม่ได้ ไปขั้นช่องทางติดต่อในป๊อปอัปแทน
 *
 * แยกตัวนอกกับตัวในเพื่อให้คำขอแพ็กเกจเกิดตอนเปิดป๊อปอัปจริงเท่านั้น
 * และทุกครั้งที่เปิดใหม่จะเริ่มที่ขั้นดูแพ็กเกจเสมอ
 */
export function PlansDialog() {
  const open = useUsageStore((state) => state.plansOpen);
  if (!open) return null;
  return <PlansDialogContent />;
}

function PlansDialogContent() {
  const { t } = useTranslation();
  const close = useUsageStore((state) => state.closePlans);
  const usage = useUsageStore((state) => state.usage);
  const plans = usePlans();
  const costs = useCreditCosts();
  // บอกเฉพาะงานที่เปิดให้ใช้อยู่ งานที่แอดมินปิดไม่ต้องโฆษณา
  const costParts = costs.data
    ? [
        costs.data.enabled.generate
          ? t("plans.costGenerate", { count: costs.data.generate.toLocaleString(intlLocale()) })
          : null,
        costs.data.enabled.removeBgStandard
          ? t("plans.costRemoveBgStandard", {
              count: costs.data.removeBgStandard.toLocaleString(intlLocale()),
            })
          : null,
        costs.data.enabled.removeBg
          ? t("plans.costRemoveBg", { count: costs.data.removeBg.toLocaleString(intlLocale()) })
          : null,
        costs.data.enabled.upscale
          ? t("plans.costUpscale", { count: costs.data.upscale.toLocaleString(intlLocale()) })
          : null,
      ].filter((part): part is string => part !== null)
    : [];
  const navigate = useNavigate();

  /** แพ็กเกจที่กดเลือก null = ยังอยู่ขั้นดูแพ็กเกจ */
  const [selected, setSelected] = useState<Plan | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  // ยังไม่รู้ยอด ไม่ติดป้ายแพ็กเกจปัจจุบันให้ใบไหน ดีกว่าเดาว่าเป็น FREE
  const currentType = usage?.userType ?? null;

  return (
    /*
      ชั้นนอกเลื่อนได้ ชั้นในสูงอย่างน้อยเต็มจอแล้วจัดกล่องไว้กลาง

      ไม่ใช้ items-center บนชั้นที่เลื่อนตรง ๆ เพราะเมื่อกล่องสูงกว่าจอ (การ์ดสี่ใบบนจอเล็ก)
      ส่วนบนของกล่องจะล้นขึ้นไปเหนือจอและเลื่อนขึ้นไปดูไม่ได้ ชั้นใน min-h-full
      ทำให้กล่องอยู่กลางเมื่อเตี้ยกว่าจอ และเริ่มจากขอบบนเมื่อสูงกว่าจอ
    */
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        // คลิกพื้นหลังเพื่อปิด แต่คลิกในกล่องต้องไม่ปิด
        onClick={close}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plans-dialog-title"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "relative w-full rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6",
            selected ? "max-w-md" : "max-w-6xl",
          )}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t("common.close")}
            autoFocus
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>

          {selected ? (
            <ContactStep
              plan={selected}
              isCurrent={selected.userType === currentType}
              onBack={() => setSelected(null)}
            />
          ) : (
            <>
              <header className="pr-10 text-center sm:px-10">
                <h2
                  id="plans-dialog-title"
                  className="text-[18px] font-semibold tracking-tight"
                >
                  {t("plans.title")}
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {costParts.length > 0 ? (
                    <>
                      {t("plans.costsLabel")} — {costParts.join(" · ")}
                      {" · "}
                    </>
                  ) : null}
                  {t("plans.subtitle")}
                </p>
              </header>

              <div className="mt-6">
                {plans.isPending ? (
                  <Loading label={t("plans.loading")} />
                ) : plans.isError ? (
                  <ErrorState
                    message={errorMessage(plans.error)}
                    error={plans.error}
                    onRetry={() => void plans.refetch()}
                  />
                ) : plans.data.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center text-[13px] text-muted-foreground">
                    {t("plans.empty")}
                  </p>
                ) : (
                  // จอเล็กเรียงลงมาทีละใบ จอกลางสองคอลัมน์ จอใหญ่ครบทุกระดับในแถวเดียว
                  <ul
                    className={cn(
                      "grid gap-4 sm:grid-cols-2",
                      plans.data.length >= 4
                        ? "xl:grid-cols-4"
                        : "lg:grid-cols-3",
                    )}
                  >
                    {plans.data.map((plan) => (
                      <PlanCard
                        key={plan.userType}
                        plan={plan}
                        currentType={currentType}
                        onChoose={() => {
                          if (plan.monthlyPrice === null || plan.monthlyPrice <= 0) {
                            setSelected(plan);
                            return;
                          }
                          close();
                          navigate(`${APP_PATH}/checkout/${plan.userType}`);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  currentType,
  onChoose,
}: {
  plan: Plan;
  currentType: UserType | null;
  onChoose: () => void;
}) {
  const { t } = useTranslation();
  const isFree = plan.userType === "FREE";
  const isCurrent = plan.userType === currentType;
  const description = localizedText(plan.description);

  const creditsTitle =
    plan.monthlyLimit === null
      ? t("plans.creditsUnlimited")
      : t(isFree ? "plans.creditsFree" : "plans.creditsPaid", {
          credits: plan.monthlyLimit.toLocaleString(intlLocale()),
        });

  return (
    <li
      className={cn(
        "relative flex min-w-0 flex-col rounded-xl border bg-card p-5",
        plan.recommended
          ? "border-primary ring-1 ring-primary"
          : "border-border",
      )}
    >
      <div className="flex min-h-5 flex-wrap items-center gap-1.5">
        {plan.recommended ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Star className="size-3 fill-current" aria-hidden />
            {t("plans.recommended")}
          </span>
        ) : null}
        {isCurrent ? (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
            {t("plans.current")}
          </span>
        ) : null}
      </div>

      <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight">
        {plan.userType}
      </h3>
      {description ? (
        <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground">
          {description}
        </p>
      ) : null}

      <p className="mt-4 flex items-baseline gap-1">
        {plan.monthlyPrice === null ? (
          <span className="text-[20px] font-semibold tracking-tight">
            {t("plans.noPrice")}
          </span>
        ) : plan.monthlyPrice === 0 ? (
          <span className="text-[28px] font-semibold tracking-tight">
            {t("plans.free")}
          </span>
        ) : (
          <>
            <span className="text-[28px] font-semibold tracking-tight tabular-nums">
              {formatUsd(plan.monthlyPrice)}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {t("plans.perPeriod")}
            </span>
          </>
        )}
      </p>

      {/* FREE ไม่มีอะไรให้ซื้อ ปุ่มจึงเป็นแค่ป้าย ส่วนแพ็กเกจเสียเงินที่ใช้อยู่กดเติมเครดิตเพิ่มได้ */}
      <Button
        variant={isFree || isCurrent ? "secondary" : "primary"}
        className="mt-4 w-full"
        disabled={isFree}
        onClick={onChoose}
      >
        {isFree
          ? isCurrent
            ? t("plans.current")
            : t("plans.starter")
          : isCurrent
            ? t("plans.topUp")
            : t("plans.choose", { plan: plan.userType })}
      </Button>

      <ul className="mt-5 space-y-2.5 border-t border-border pt-4">
        {/* บรรทัดแรกสร้างจากตัวเลขเครดิตจริงเสมอ แอดมินไม่ต้องพิมพ์ซ้ำและไม่มีทางไม่ตรงกับระบบ */}
        <FeatureRow title={creditsTitle} />
        {plan.features.map((feature, index) => (
          <FeatureRow
            key={index}
            title={localizedText(feature.title)}
            description={localizedText(feature.description)}
          />
        ))}
      </ul>
    </li>
  );
}

function FeatureRow({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  if (!title) return null;
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** ขั้นที่สอง — ช่องทางติดต่อเพื่อให้แอดมินเติมแพ็กเกจที่เลือก */
function ContactStep({
  plan,
  isCurrent,
  onBack,
}: {
  plan: Plan;
  isCurrent: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("plans.back")}
      </button>

      <h2
        id="plans-dialog-title"
        className="mt-3 pr-8 text-[15px] font-semibold tracking-tight"
      >
        {isCurrent
          ? t("plans.contactTitleTopUp", { plan: plan.userType })
          : t("plans.contactTitleUpgrade", { plan: plan.userType })}
      </h2>

      {plan.monthlyPrice !== null && plan.monthlyPrice > 0 ? (
        <p className="mt-1 text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {formatUsd(plan.monthlyPrice)}
          </span>
          {t("plans.perPeriod")}
          {plan.monthlyLimit !== null
            ? ` · ${t("plans.creditsPaid", { credits: plan.monthlyLimit.toLocaleString(intlLocale()) })}`
            : ` · ${t("plans.creditsUnlimited")}`}
        </p>
      ) : null}

      <p className="mt-3 text-[13px]">
        {t("plans.contactBody", { plan: plan.userType })}
      </p>

      <div className="mt-4">
        <ContactChannelList />
      </div>

      <Button variant="ghost" className="mt-4 w-full" onClick={onBack}>
        {t("plans.back")}
      </Button>
    </>
  );
}
