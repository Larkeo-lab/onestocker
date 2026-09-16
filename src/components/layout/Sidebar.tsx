import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { NAV_SECTIONS } from "@/config/nav";
import { platformName } from "@/config/platforms";
import { useCreditCosts } from "@/hooks/queries";
import { APP_PATH, siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { getSelectedPlatforms, usePlatformsStore } from "@/store/platforms";

type PanelProps = {
  onNavigate?: () => void;
};

function SidebarPanel({ onNavigate }: PanelProps) {
  const { t } = useTranslation();
  const selectedIds = usePlatformsStore((s) => s.selectedIds);
  const activePlatformId = usePlatformsStore((s) => s.activePlatformId);
  const setActivePlatformId = usePlatformsStore((s) => s.setActivePlatformId);
  const selectedPlatforms = getSelectedPlatforms(selectedIds);
  // งานที่แอดมินปิดอยู่ไม่แสดงเมนู ระหว่างโหลดถือว่าเปิด (ดู useFeatureEnabled)
  const enabled = useCreditCosts().data?.enabled;
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
            {t("sidebar.tagline")}
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.09em] text-subtle-foreground uppercase">
              {t(section.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {section.items
                .filter((item) => !item.feature || enabled?.[item.feature] !== false)
                .map((item) => {
                const Icon = item.icon;
                const isPlatformsItem = item.to === `${APP_PATH}/platforms`;
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
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
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
                                title={t("sidebar.selectPlatform", {
                                  name: platformName(platform, t),
                                })}
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
                                    {platformName(platform, t)}
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

    </div>
  );
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border lg:block">
        <SidebarPanel />
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
            aria-label={t("nav.closeNavigation")}
            className="absolute top-3.5 -right-11 flex size-8 items-center justify-center rounded-md bg-card text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
          <SidebarPanel onNavigate={onClose} />
        </div>
      </div>
    </>
  );
}
