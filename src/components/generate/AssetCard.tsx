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
  Video,
  X,
} from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  findPlatform,
  platformName,
  titleRecommended,
} from '@/config/platforms'
import { useCopy } from '@/hooks/useCopy'
import { useLanguageName } from '@/hooks/useLanguageName'
import { cn } from '@/lib/utils'
import { usePlatformsStore } from '@/store/platforms'
import {
  formatDuration,
  formatFileSize,
  type Asset,
  type AssetTranslation,
} from '@/types/asset'

function FieldLabel({
  label,
  count,
  max,
  warning,
  action,
}: {
  label: string
  count: number
  max: number
  /** ข้อความเตือนเมื่อยาวเกินที่แนะนำ ไม่ส่งมาแปลว่าไม่ต้องเตือน */
  warning?: string
  /** ปุ่มท้ายแถว เช่นปุ่มคัดลอกของช่องนี้ */
  action?: ReactNode
}) {
  const warn = warning !== undefined

  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          title={warning}
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
  const { t } = useTranslation()
  const [copied, copy] = useCopy()

  return (
    <button
      type="button"
      onClick={() => copy(text())}
      title={t('asset.copyField', { field: label })}
      aria-label={
        copied
          ? t('asset.fieldCopied', { field: label })
          : t('asset.copyField', { field: label })
      }
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
  const { t } = useTranslation()

  if (asset.status === 'uploading') {
    return (
      <Badge tone="primary">
        <LoaderCircle className="size-3 animate-spin" aria-hidden />
        {t('asset.uploading')}
      </Badge>
    )
  }
  if (asset.status === 'generating') {
    return (
      <Badge tone="primary">
        <LoaderCircle className="size-3 animate-spin" aria-hidden />
        {t('asset.generating')}
      </Badge>
    )
  }
  if (asset.status === 'error') {
    return (
      <Badge tone="danger">
        <TriangleAlert className="size-3" aria-hidden />
        {t('asset.failed')}
      </Badge>
    )
  }
  if (asset.status === 'generated') {
    return (
      <Badge tone="success">
        <CircleCheck className="size-3" aria-hidden />
        {t('asset.generated')}
      </Badge>
    )
  }
  return (
    <Badge tone="neutral">
      <CircleCheck className="size-3" aria-hidden />
      {t('asset.uploaded')}
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
  titleMax,
}: {
  translation: AssetTranslation
  assetId: string
  status: string
  /** เพดาน title ของแพลตฟอร์มที่ใช้สร้าง ฉบับแปลใช้เพดานเดียวกัน */
  titleMax: number
}) {
  const { t } = useTranslation()
  const languageName = useLanguageName()
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
            label={t('asset.title')}
            count={translation.title.length}
            max={titleMax}
            action={<CopyButton text={titleText} label={t('asset.title')} />}
          />
          <textarea
            key={`${key}-title`}
            ref={titleRef}
            rows={4}
            className={cn(inputClass, 'resize-y')}
            defaultValue={translation.title}
            aria-label={t('asset.titleIn', {
              language: languageName(translation.language),
            })}
          />
        </div>

        {translation.keywords.length > 0 ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {t('asset.keywords')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
                  {translation.keywords.length}
                </span>
                <CopyButton text={keywordsText} label={t('asset.keywords')} />
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
  const { t } = useTranslation()
  const languageName = useLanguageName()
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

  /**
   * ตัวนับและเพดานยึดแพลตฟอร์มที่ผลลัพธ์นี้ถูกสร้างตามกฎจริง
   * ยังไม่ได้สร้างก็ยึดแพลตฟอร์มที่เลือกอยู่ ซึ่งจะถูกใช้ตอนกดสร้าง
   */
  const activePlatformId = usePlatformsStore((s) => s.activePlatformId)
  const platform = findPlatform(asset.platformId ?? activePlatformId)
  const recommended = titleRecommended(platform)
  const platformChanged =
    asset.status === 'generated' &&
    asset.platformId !== undefined &&
    asset.platformId !== activePlatformId

  /** รวมทุกภาษาไว้ก้อนเดียว ภาษาอังกฤษก่อน แล้วค่อยฉบับแปลตามลำดับที่เลือก */
  const everything = () =>
    [
      [titleText(), keywordsText()].filter(Boolean).join('\n\n'),
      ...translations.map((translation) =>
        [
          languageName(translation.language),
          translation.title,
          translation.keywords.join(', '),
        ]
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
          <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
            {asset.previewUrl ? (
              <img
                src={asset.previewUrl}
                alt={asset.filename}
                className="mx-auto max-h-44 w-auto object-contain"
              />
            ) : (
              <div className="h-32 w-full animate-pulse bg-muted" />
            )}
            {/* รูปย่อของวิดีโอเป็นภาพนิ่ง ต้องบอกไว้ ไม่งั้นดูไม่ออกว่าเป็นคลิป */}
            {asset.kind === 'video' ? (
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10.5px] text-white tabular-nums">
                <Video className="size-3" aria-hidden />
                {asset.duration !== undefined
                  ? formatDuration(asset.duration)
                  : null}
              </span>
            ) : null}
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
              {t('asset.result')}
              {asset.platformId ? (
                <span className="ml-2 font-normal text-subtle-foreground">
                  {t('asset.forPlatform', {
                    platform: platformName(platform, t),
                  })}
                </span>
              ) : null}
              {asset.category ? (
                <span className="ml-2 font-normal text-subtle-foreground">
                  {asset.category}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={onRemove}
              aria-label={t('asset.remove', { name: asset.filename })}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>

          {/* ผลลัพธ์ไม่เปลี่ยนตามเองเมื่อสลับแพลตฟอร์ม ต้องบอกให้กดสร้างใหม่ */}
          {platformChanged ? (
            <p className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-muted px-3 py-2 text-[12.5px] text-warning">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t('asset.platformChanged', {
                from: platformName(platform, t),
                to: platformName(findPlatform(activePlatformId), t),
              })}
            </p>
          ) : null}

          {failed ? (
            <p className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              {asset.error ?? t('errors.generateFailed')}
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
                  {languageName('en')}
                </p>
              ) : null}

              <div>
                <FieldLabel
                  label={t('asset.title')}
                  count={asset.title.length}
                  max={platform.limits.title}
                  warning={
                    asset.title.length > recommended
                      ? t('asset.titleRecommended', {
                          max: recommended,
                          platform: platformName(platform, t),
                        })
                      : undefined
                  }
                  action={<CopyButton text={titleText} label={t('asset.title')} />}
                />
                <textarea
                  key={`${asset.id}-title-${asset.status}`}
                  ref={titleRef}
                  rows={4}
                  className={cn(inputClass, 'resize-y')}
                  defaultValue={asset.title}
                  placeholder={t('asset.titlePlaceholder')}
                  aria-label={t('asset.title')}
                />
              </div>

              {asset.keywords.length > 0 ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      {t('asset.keywords')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
                        {asset.keywords.length}/{platform.limits.keywords}
                      </span>
                      <CopyButton text={keywordsText} label={t('asset.keywords')} />
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
                          aria-label={t('asset.removeKeyword', { keyword })}
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
                  titleMax={platform.limits.title}
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
              {failed ? t('asset.retry') : t('asset.regenerate')}
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
              {copiedAll ? t('asset.copied') : t('asset.copyAll')}
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

