import { Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { PLATFORMS } from "@/config/platforms";
import type { GenerationWithPreview } from "@/types/generation";

/** วันเวลาแบบสั้น อ่านง่ายทั้งวันนี้และเดือนก่อน */
function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryCard({
  generation,
}: {
  generation: GenerationWithPreview;
}) {
  const platform = PLATFORMS.find((p) => p.id === generation.platformId);

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="hidden size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted sm:flex">
        {generation.previewUrl ? (
          <img
            src={generation.previewUrl}
            alt={generation.filename}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-5 text-subtle-foreground" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <p className="truncate font-mono text-[12.5px] font-medium">
            {generation.filename}
          </p>
          <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
            {formatDate(generation.createdAt)}
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed">{generation.title}</p>

        {generation.keywords.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {generation.keywords.map((keyword) => (
              <li
                key={keyword}
                className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
              >
                {keyword}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {platform ? (
            <Badge tone="neutral" className="gap-1.5">
              {platform.icon ? (
                <img
                  src={platform.icon}
                  alt={platform.name}
                  className="size-3.5 rounded-full object-cover"
                />
              ) : null}
              {platform.name}
            </Badge>
          ) : null}

          {generation.category ? (
            <Badge tone="neutral">{generation.category}</Badge>
          ) : null}
        </div>
      </div>
    </article>
  );
}
