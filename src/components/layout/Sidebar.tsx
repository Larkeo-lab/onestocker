import { SignOutButton } from "@clerk/clerk-react";
import { Check, LogOut, Settings, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { NAV_SECTIONS } from "@/config/nav";
import { env } from "@/lib/env";
import { siteConfig } from "@/config/site";
import type { Meta } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fullName, type Profile } from "@/types/profile";
import { getSelectedPlatforms, usePlatformsStore } from "@/store/platforms";
import { useUsageStore } from "@/store/usage";

type PanelProps = {
  onNavigate?: () => void;
  profile: Profile | null;
  meta: Meta | null;
  /** true = ต่อ API ไม่ติด แสดงสถานะให้รู้แทนที่จะโชว์ช่องว่าง */
  offline: boolean;
};

/** เปอร์เซ็นต์ที่ทำให้แถบเปลี่ยนเป็นสีเตือน */
const USAGE_WARN_PERCENT = 80;

function formatResetDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * ยอดที่ใช้ไปในเดือนนี้ เทียบกับเพดานของระดับผู้ใช้
 *
 * อ่านจาก store ตรง ๆ ไม่รับเป็น prop เพราะตัวที่ทำให้ตัวเลขขยับคือ
 * GenerateProvider ซึ่งอยู่คนละกิ่งของต้นไม้ ไม่ได้เป็นพ่อของ sidebar
 *
 * ยังไม่รู้ยอดก็แสดงขีดไว้ ดีกว่าโชว์ 0 ให้เข้าใจผิดว่ายังไม่ได้ใช้เลย
 */
function UsageCard() {
  const usage = useUsageStore((state) => state.usage);

  const limit = usage?.monthlyLimit ?? null;
  const percent =
    usage && limit !== null && limit > 0
      ? Math.min(100, Math.round((usage.used / limit) * 100))
      : null;

  const exhausted = usage !== null && limit !== null && usage.used >= limit;

  const countTone = !usage
    ? "text-subtle-foreground"
    : exhausted
      ? "text-danger"
      : percent !== null && percent >= USAGE_WARN_PERCENT
        ? "text-warning"
        : "text-subtle-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          Usage this month
        </span>
        <span className={cn("shrink-0 font-mono text-[11px]", countTone)}>
          {!usage ? "—" : limit === null ? `${usage.used} · ไม่จำกัด` : `${usage.used}/${limit}`}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        {percent !== null ? (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              exhausted
                ? "bg-danger"
                : percent >= USAGE_WARN_PERCENT
                  ? "bg-warning"
                  : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        ) : null}
      </div>

      {usage ? (
        <p className="mt-1.5 truncate text-[10px] text-subtle-foreground">
          {usage.userType}
          {usage.resetsAt ? ` · รีเซ็ต ${formatResetDate(usage.resetsAt)}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function SidebarPanel({ onNavigate, profile }: PanelProps) {
  const selectedIds = usePlatformsStore((s) => s.selectedIds);
  const activePlatformId = usePlatformsStore((s) => s.activePlatformId);
  const setActivePlatformId = usePlatformsStore((s) => s.setActivePlatformId);
  const selectedPlatforms = getSelectedPlatforms(selectedIds);
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
        {/* โลโก้พื้นหลังโปร่งใส จึงวางบนพื้นหลังของแอปได้ทั้งโหมดมืดและสว่าง */}
        <img
          src="/logo/mark.png"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-tight font-semibold tracking-tight">
            {siteConfig.name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-subtle-foreground">
            Metadata Studio
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.09em] text-subtle-foreground uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isPlatformsItem = item.to === "/platforms";
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                          isActive
                            ? "bg-primary-soft font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {isPlatformsItem && selectedPlatforms.length > 0 ? (
                        <span className="font-mono text-[10.5px] font-normal text-subtle-foreground tabular-nums">
                          {selectedPlatforms.length}
                        </span>
                      ) : null}
                    </NavLink>

                    {/* แสดงแพลตฟอร์มที่เลือกไว้ ถัดลงมาจากเมนู Platforms */}
                    {isPlatformsItem && selectedPlatforms.length > 0 ? (
                      <ul className="mt-1 ml-3.5 space-y-0.5 border-l border-border/60 pl-2.5">
                        {selectedPlatforms.map((platform) => {
                          const isActive =
                            (activePlatformId || selectedPlatforms[0]?.id) ===
                            platform.id;
                          return (
                            <li key={platform.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePlatformId(platform.id);
                                  onNavigate?.();
                                }}
                                title={`Select ${platform.name} for generate`}
                                className={cn(
                                  "flex h-7 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 text-[12px] transition-colors",
                                  isActive
                                    ? "bg-primary-soft font-medium text-primary"
                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-[0.98]",
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  {platform.icon ? (
                                    <img
                                      src={platform.icon}
                                      alt=""
                                      className="size-3.5 shrink-0 rounded-xs object-contain"
                                    />
                                  ) : (
                                    <span
                                      className="flex size-3.5 shrink-0 items-center justify-center rounded-xs text-[8px] font-bold text-white"
                                      style={{ backgroundColor: platform.color }}
                                    >
                                      {platform.monogram}
                                    </span>
                                  )}
                                  <span className="truncate text-left">
                                    {platform.name}
                                  </span>
                                </span>

                                {isActive ? (
                                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-3 border-t border-border p-3">
        {/* เมนู Settings ย้ายมาวางชิดล่าง */}
        <NavLink
          to="/settings"
          onClick={onNavigate}
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
          <span>Settings</span>
        </NavLink>

        <UsageCard />

        {/* บัญชีผู้ใช้ — ปุ่มขวาคือออกจากระบบ ต่อกับ Clerk ทีหลัง */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          {profile?.profileUrl ? (
            <img
              src={profile.profileUrl}
              alt=""
              className="size-7 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="size-7 shrink-0 rounded-full bg-muted" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] leading-tight font-medium">
              {fullName(profile) || "—"}
            </span>
            <span className="block truncate text-[11px] leading-tight text-subtle-foreground">
              {profile?.email ?? ""}
            </span>
          </span>

          {/*
            ตอนข้ามล็อกอินไม่มี session อยู่จริง จึงไม่มีอะไรให้ออก
            แสดงป้ายไว้แทน ไม่งั้นจะงงว่าทำไมกดออกจากระบบไม่ได้
          */}
          {env.authDevBypass ? (
            <span
              title="ข้ามระบบล็อกอินอยู่ (VITE_AUTH_DEV_BYPASS=true) จึงไม่มีอะไรให้ออก"
              className="shrink-0 rounded border border-warning/40 bg-warning-soft px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-warning uppercase"
            >
              dev
            </span>
          ) : (
            <SignOutButton>
              <button
                type="button"
                aria-label="ออกจากระบบ"
                title="ออกจากระบบ"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-3.5" aria-hidden />
              </button>
            </SignOutButton>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  open,
  onClose,
  profile,
  meta,
  offline,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  meta: Meta | null;
  offline: boolean;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border lg:block">
        <SidebarPanel profile={profile} meta={meta} offline={offline} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-64 border-r border-border transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute top-3.5 -right-11 flex size-8 items-center justify-center rounded-md bg-card text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
          <SidebarPanel
            onNavigate={onClose}
            profile={profile}
            meta={meta}
            offline={offline}
          />
        </div>
      </div>
    </>
  );
}
