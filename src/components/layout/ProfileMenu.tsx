import { SignOutButton } from "@clerk/clerk-react";
import { LogOut, Settings, Zap } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { APP_PATH } from "@/config/site";
import { PAID_GRADIENT } from "@/lib/plans";
import { env } from "@/lib/env";
import { usageMeter } from "@/lib/usage";
import { cn } from "@/lib/utils";
import { useUsageStore } from "@/store/usage";
import { fullName, type Profile } from "@/types/profile";

import { UsageCard } from "./UsageCard";

function Avatar({ profile, className }: { profile: Profile | null; className: string }) {
  return profile?.profileUrl ? (
    <img
      src={profile.profileUrl}
      alt=""
      className={cn("shrink-0 rounded-full border border-border object-cover", className)}
    />
  ) : (
    <span className={cn("shrink-0 rounded-full bg-muted", className)} />
  );
}

/**
 * สีไล่เฉดของวงแหวนรอบรูปโปรไฟล์แพ็กเกจเสียเงิน
 *
 * ใช้ชั้นพื้นหลังที่ใหญ่กว่ารูปเล็กน้อยแทน ring เพราะ ring ของ Tailwind ใส่สีไล่เฉดไม่ได้
 * ชั้นเดียวกันนี้เอาไปเบลอเป็นแสงเรืองด้านหลังด้วย สองวงจะได้เป็นสีชุดเดียวกัน
 */
const PAID_RING = PAID_GRADIENT;

/**
 * ป้ายแพ็กเกจที่ใช้อยู่ ให้เห็นระดับปัจจุบันก่อนกดปุ่มอัปเกรด
 *
 * ยังไม่รู้ยอดก็ไม่ต้องแสดง ดีกว่าขึ้น FREE ไว้ก่อนแล้วค่อยเด้งเป็นแพ็กเกจจริง
 */
function PlanBadge() {
  const usage = useUsageStore((state) => state.usage);
  if (!usage) return null;

  return (
    <span
      className={cn(
        "flex h-6 items-center rounded-full border px-2 text-[10px] font-semibold tracking-wide uppercase",
        usage.userType === "FREE"
          ? "border-border bg-card text-muted-foreground"
          : "border-primary/30 bg-primary-soft text-primary",
      )}
    >
      {usage.userType}
    </span>
  );
}

/**
 * ป้ายเครดิตบน header ให้เห็นยอดโดยไม่ต้องเปิดเมนู
 *
 * สีตามเกณฑ์เดียวกับการ์ดเครดิตใน dropdown
 * เหลือน้อยเป็นแดงอ่อน หมดแล้วเป็นแดงเต็มใบ จะได้สะดุดตาก่อนกด Generate ไม่ผ่าน
 */
function CreditPill() {
  const { t } = useTranslation();
  const usage = useUsageStore((state) => state.usage);
  const { limit, exhausted, low, warn } = usageMeter(usage);

  return (
    <span
      title={
        !usage
          ? t("account.credits")
          : limit === null
            ? t("account.unlimited", { used: usage.used })
            : t("account.creditsTitle", { used: usage.used, limit })
      }
      className={cn(
        "flex h-6 items-center gap-1 rounded-full border px-2 font-mono text-[11px] tabular-nums transition-colors",
        exhausted
          ? "border-danger bg-danger font-semibold text-white"
          : low
            ? "border-danger/40 bg-danger-soft text-danger"
            : warn
              ? "border-warning/40 bg-warning-soft text-warning"
              : "border-border bg-card text-muted-foreground",
      )}
    >
      <Zap className="size-3 shrink-0" aria-hidden />
      {!usage ? "—" : limit === null ? `${usage.used}/∞` : `${usage.used}/${limit}`}
    </span>
  );
}

/**
 * โปรไฟล์มุมขวาบน กดแล้วเปิดเมนูที่มีเครดิต ตั้งค่า ภาษา และออกจากระบบ
 *
 * ปิดเมนูด้วยการฟัง pointerdown ทั้งหน้าแทนการวางชั้นใส fixed ทับจอ
 * เพราะ header ใช้ backdrop-blur ซึ่งทำให้ลูกที่เป็น fixed วางตำแหน่งเทียบกับ header
 * ชั้นใสจะคลุมแค่แถบ header กดที่เนื้อหาด้านล่างแล้วเมนูไม่ปิด
 */
export function ProfileMenu({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // แพ็กเกจเสียเงินได้วงแหวนเรืองแสงรอบรูป ระหว่างยังไม่รู้ยอดถือว่ายังไม่ใช่ จะได้ไม่วูบขึ้นมาแล้วหายไป
  const paidPlan = useUsageStore(
    (state) => state.usage !== null && state.usage.userType !== "FREE",
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t("account.menu")}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-2 rounded-full pr-1 pl-1.5 transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
      >
        <PlanBadge />
        <CreditPill />

        {/* บน header เห็นแค่รูปโปรไฟล์ ชื่อกับอีเมลอยู่ในเมนูที่กดเปิด */}
        <span className="relative flex shrink-0">
          {/*
            แสงเรืองรอบรูปของแพ็กเกจเสียเงิน วางเป็นชั้นเบลอไว้ใต้รูป
            ไม่ใช้ shadow เพราะรูปมีขอบมนแล้วเงาจะไม่กลมตาม
            เครื่องที่ตั้งค่าลดการเคลื่อนไหวจะได้แสงนิ่ง ๆ ไม่มีจังหวะหายใจ
          */}
          {paidPlan ? (
            <span
              aria-hidden
              className={cn(
                "absolute -inset-1 animate-pulse rounded-full opacity-60 blur-[6px] motion-reduce:animate-none",
                PAID_RING,
              )}
            />
          ) : null}
          <span className={cn("relative rounded-full", paidPlan && `p-0.5 ${PAID_RING}`)}>
            <Avatar
              profile={profile}
              className={cn(
                "size-7 transition-shadow",
                paidPlan ? "border-transparent" : open && "ring-2 ring-primary/30",
              )}
            />
          </span>
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("account.menu")}
          className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-card p-3 shadow-lg"
        >
          <div className="flex items-center gap-2.5 px-1">
            <Avatar profile={profile} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-tight font-medium">
                {fullName(profile) || "—"}
              </span>
              <span className="block truncate text-[11.5px] leading-tight text-subtle-foreground">
                {profile?.email ?? ""}
              </span>
            </span>
          </div>

          <UsageCard />

          <div className="space-y-2 border-t border-border pt-3">
            <NavLink
              to={`${APP_PATH}/settings`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                  isActive
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Settings className="size-4 shrink-0" aria-hidden />
              <span>{t("nav.settings")}</span>
            </NavLink>

            <LanguageSelect />
          </div>

          <div className="border-t border-border pt-3">
            {/*
              ตอนข้ามล็อกอินไม่มี session อยู่จริง จึงไม่มีอะไรให้ออก
              แสดงป้ายไว้แทน ไม่งั้นจะงงว่าทำไมกดออกจากระบบไม่ได้
            */}
            {env.authDevBypass ? (
              <p
                title={t("account.devBypassTitle")}
                className="flex h-9 items-center gap-2.5 px-2 text-[13px] text-subtle-foreground"
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{t("account.signOut")}</span>
                <span className="shrink-0 rounded border border-warning/40 bg-warning-soft px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-warning uppercase">
                  dev
                </span>
              </p>
            ) : (
              <SignOutButton>
                <button
                  type="button"
                  className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  {t("account.signOut")}
                </button>
              </SignOutButton>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
