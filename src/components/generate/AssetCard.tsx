import {
  Check,
  CircleCheck,
  Copy,
  Info,
  Languages,
  LoaderCircle,
  RefreshCw,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useRef, type ReactNode } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCopy } from '@/hooks/useCopy'
import { cn } from '@/lib/utils'
import { formatFileSize, type Asset, type AssetTranslation } from '@/types/asset'
import { languageName } from '@/types/settings'

/** ความยาว title ที่ Adobe Stock แนะนำ เกินกว่านี้เตือนแต่ยังส่งได้ */
const TITLE_RECOMMENDED = 140
const TITLE_MAX = 200

function FieldLabel({
  label,
  count,
  max,
  warn,
  action,
}: {
  label: string
  count: number
  max: number
  warn?: boolean
  /** ปุ่มท้ายแถว เช่นปุ่มคัดลอกของช่องนี้ */
  action?: ReactNode
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          title={
            warn
              ? `Adobe Stock recommends ${TITLE_RECOMMENDED} characters or fewer`
              : undefined
          }
          className={cn(
            'font-mono text-[11px] tabular-nums',
            warn ? 'text-warning' : 'text-subtle-foreground',
          )}
        >
          {count}/{max}
        </span>
        {action}
      </div>
    </div>
  )
}

/**
 * ปุ่มคัดลอกของแต่ละช่อง
 * รับค่าเป็นฟังก์ชันเพราะช่อง title แก้ไขได้
 * ต้องอ่านค่าตอนกด ไม่ใช่ค่าที่โมเดลส่งมาตอนแรก
 */
function CopyButton({ text, label }: { text: () => string; label: string }) {
  const [copied, copy] = useCopy()

  return (
    <button
      type="button"
      onClick={() => copy(text())}
      title={`Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
        copied
          ? 'text-success'
          : 'text-subtle-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  )
}

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:outline-none'

/** สถานะของรูปนี้รูปเดียว ครอบทั้งช่วงอัปโหลดและช่วงสร้าง metadata */
function StatusBadge({ asset }: { asset: Asset }) {
  if (asset.status === 'uploading') {
    return (
      <Badge tone="primary">
        <LoaderCircle className="size-3 animate-spin" aria-hidden />
        Uploading
      </Badge>
    )
  }
  if (asset.status === 'generating') {
    return (
      <Badge tone="primary">
        <LoaderCircle className="size-3 animate-spin" aria-hidden />
        Generating
      </Badge>
    )
  }
  if (asset.status === 'error') {
    return (
      <Badge tone="danger">
        <TriangleAlert className="size-3" aria-hidden />
        Generate failed
      </Badge>
    )
  }
  if (asset.status === 'generated') {
    return (
      <Badge tone="success">
        <CircleCheck className="size-3" aria-hidden />
        Generated
      </Badge>
    )
  }
  return (
    <Badge tone="neutral">
      <CircleCheck className="size-3" aria-hidden />
      Uploaded
    </Badge>
  )
}

/**
 * ผลลัพธ์ฉบับแปลหนึ่งภาษา วางต่อจากภาษาอังกฤษลงมา
 * แก้ข้อความได้เหมือนกัน และมีปุ่มคัดลอกของตัวเองครบทุกช่อง
 */
function TranslationBlock({
  translation,
  assetId,
  status,
}: {
  translation: AssetTranslation
  assetId: string
  status: string
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const titleText = () => titleRef.current?.value ?? translation.title
  const keywordsText = () => translation.keywords.join(', ')

  const key = `${assetId}-${translation.language}-${status}`

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="mb-3 flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        <Languages className="size-3.5" aria-hidden />
        {languageName(translation.language)}
      </p>

      <div className="space-y-3">
        <div>
          <FieldLabel
            label="Title"
            count={translation.title.length}
            max={TITLE_MAX}
            action={<CopyButton text={titleText} label="title" />}
          />
          <textarea
            key={`${key}-title`}
            ref={titleRef}
            rows={4}
            className={cn(inputClass, 'resize-y')}
            defaultValue={translation.title}
            aria-label={`Title (${languageName(translation.language)})`}
          />
        </div>

        {translation.keywords.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Keywords
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
                  {translation.keywords.length}
                </span>
                <CopyButton text={keywordsText} label="keywords" />
              </div>
            </div>
            <p className="rounded-md border border-border bg-background px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {translation.keywords.join(', ')}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * ผลลัพธ์ของรูปหนึ่งรูป การ์ดพวกนี้เรียงลงมาทีละรูปตามลำดับที่อัป
 * แต่ละใบจึงต้องมีรูปและชื่อไฟล์ของตัวเอง ไม่งั้นแยกไม่ออกว่าอันไหนของใคร
 */
export function AssetCard({
  asset,
  index,
  onRemove,
  onRegenerate,
}: {
  asset: Asset
  /** ลำดับที่แสดงบนหัวการ์ด เริ่มที่ 1 */
  index: number
  onRemove: () => void
  onRegenerate: () => void
}) {
  const uploading = asset.status === 'uploading'
  const generating = asset.status === 'generating'
  // รูปที่อัปไม่สำเร็จถูกถอดออกจากรายการไปแล้ว error ที่เหลือคือพลาดตอนสร้าง metadata
  const failed = asset.status === 'error'
  const busy = uploading || generating

  /**
   * ช่องนี้เป็น uncontrolled input ผู้ใช้แก้ข้อความได้เอง
   * ปุ่มคัดลอกจึงต้องอ่านจาก DOM เพื่อให้ได้ข้อความที่เห็นอยู่จริง
   * ถ้าช่องยังไม่ถูก render (กำลังทำงานหรือพลาด) ค่อยถอยไปใช้ค่าจาก asset
   */
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const titleText = () => titleRef.current?.value ?? asset.title
  const keywordsText = () => asset.keywords.join(', ')

  const translations = asset.translations ?? []

  /** รวมทุกภาษาไว้ก้อนเดียว ภาษาอังกฤษก่อน แล้วค่อยฉบับแปลตามลำดับที่เลือก */
  const everything = () =>
    [
      [titleText(), keywordsText()].filter(Boolean).join('\n\n'),
      ...translations.map((t) =>
        [languageName(t.language), t.title, t.keywords.join(', ')]
          .filter(Boolean)
          .join('\n\n'),
      ),
    ].join('\n\n———\n\n')

  const [copiedAll, copyAll] = useCopy()

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        {/* รูปและข้อมูลไฟล์ของการ์ดใบนี้ */}
        <div className="sm:w-44 sm:shrink-0">
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            {asset.previewUrl ? (
              <img
                src={asset.previewUrl}
                alt={asset.filename}
                className="mx-auto max-h-44 w-auto object-contain"
              />
            ) : (
              <div className="h-32 w-full animate-pulse bg-muted" />
            )}
          </div>

          <p
            title={asset.filename}
            className="mt-2 truncate font-mono text-[12px] font-medium"
          >
            {asset.filename}
          </p>
          <p className="mt-0.5 text-[11.5px] text-subtle-foreground">
            {asset.width > 0 ? `${asset.width} × ${asset.height} · ` : ''}
            {formatFileSize(asset.size)}
          </p>
          <div className="mt-2">
            <StatusBadge asset={asset} />
          </div>
        </div>

        {/* ผลลัพธ์ */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="truncate text-[13px] font-semibold tracking-tight">
              <span className="font-mono text-subtle-foreground tabular-nums">
                #{index}
              </span>{' '}
              Result
              {asset.category ? (
                <span className="ml-2 font-normal text-subtle-foreground">
                  {asset.category}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${asset.filename}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>

          {failed ? (
            <p className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              {asset.error ?? 'สร้าง metadata ไม่สำเร็จ'}
            </p>
          ) : busy ? (
            <div className="space-y-2" aria-hidden>
              <div className="h-9 animate-pulse rounded-md bg-muted" />
              <div className="h-16 animate-pulse rounded-md bg-muted" />
            </div>
          ) : (
            <div className="space-y-4">
              {translations.length > 0 ? (
                <p className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  <Languages className="size-3.5" aria-hidden />
                  English
                </p>
              ) : null}

              <div>
                <FieldLabel
                  label="Title"
                  count={asset.title.length}
                  max={TITLE_MAX}
                  warn={asset.title.length > TITLE_RECOMMENDED}
                  action={<CopyButton text={titleText} label="title" />}
                />
                <textarea
                  key={`${asset.id}-title-${asset.status}`}
                  ref={titleRef}
                  rows={4}
                  className={cn(inputClass, 'resize-y')}
                  defaultValue={asset.title}
                  placeholder="Not generated yet — click Generate"
                  aria-label="Title"
                />
              </div>

              {asset.keywords.length > 0 ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Keywords
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
                        {asset.keywords.length}/50
                      </span>
                      <CopyButton text={keywordsText} label="keywords" />
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {asset.keywords.map((keyword) => (
                      <li
                        key={keyword}
                        className="inline-flex items-center gap-1 rounded border border-border bg-muted py-1 pr-1 pl-2 text-[11.5px] text-muted-foreground"
                      >
                        {keyword}
                        <button
                          type="button"
                          aria-label={`Remove keyword ${keyword}`}
                          className="flex size-3.5 items-center justify-center rounded-sm text-subtle-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          <X className="size-2.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {translations.map((translation) => (
                <TranslationBlock
                  key={translation.language}
                  translation={translation}
                  assetId={asset.id}
                  status={asset.status}
                />
              ))}
            </div>
          )}

          {asset.notes && asset.notes.length > 0 ? (
            <ul className="mt-4 space-y-1 rounded-md border border-border bg-muted px-3 py-2">
              {asset.notes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-2 text-[12px] text-muted-foreground"
                >
                  <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-1 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onRegenerate}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {failed ? 'Retry' : 'Regenerate'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => copyAll(everything())}
            >
              {copiedAll ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copiedAll ? 'Copied' : 'Copy all'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

