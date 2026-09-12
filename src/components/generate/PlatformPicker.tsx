import { Check } from "lucide-react";
import { useState } from "react";

import { PLATFORMS, type Platform } from "@/config/platforms";
import { cn } from "@/lib/utils";
import { usePlatformsStore } from "@/store/platforms";

function PlatformIcon({ platform }: { platform: Platform }) {
  const [error, setError] = useState(false);

  if (platform.icon && !error) {
    return (
      <div className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/40 bg-white p-0.5 shadow-2xs">
        <img
          src={platform.icon}
          alt={platform.name}
          onError={() => setError(true)}
          className="size-full rounded-xs object-contain"
        />
      </div>
    );
  }

  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
      style={{ backgroundColor: platform.color }}
      aria-hidden
    >
      {platform.monogram}
    </span>
  );
}

export function PlatformPicker() {
  const selected = usePlatformsStore((s) => s.selectedIds);
  const toggle = usePlatformsStore((s) => s.togglePlatform);

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight">
            Export platforms
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Metadata is generated once, then trimmed to each platform&apos;s
            limits
          </p>
        </div>
        <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
          {selected.length} of {PLATFORMS.length} selected
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {PLATFORMS.map((platform) => {
          const active = selected.includes(platform.id);
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => toggle(platform.id)}
              aria-pressed={active}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                active
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:border-border-strong hover:bg-muted",
              )}
            >
              <PlatformIcon platform={platform} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] leading-tight font-medium">
                  {platform.name}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong",
                )}
              >
                {active ? <Check className="size-2.5" aria-hidden /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
