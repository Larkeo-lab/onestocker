import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { intlLocale } from '@/config/i18n'
import { useRemoveBgResults, useUpscales } from '@/hooks/queries'
import { errorMessage } from '@/lib/error'
import { CHECKERBOARD_STYLE, formatBytes } from '@/lib/removeBg'
import { MAX_INPUT_MB } from '@/lib/upscale'
import { cn } from '@/lib/utils'
import type { LibraryImage, LibraryKind } from '@/types/upscale'

/** รูปต่อหน้าในหน้าต่างเลือก ต้องไม่เกิน MaxLimit ของทั้งสองเส้น */
const PAGE_SIZE = 18

/**
 * เลือกรูปจากคลังรูปมาอัปสเกล เลือกได้หลายรูปข้ามแท็บและข้ามหน้า
 * รูปที่ไฟล์ใหญ่เกินเพดาน (MAX_INPUT_MB) แสดงไว้แต่เลือกไม่ได้
 */
export function LibraryPickerDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (images: LibraryImage[]) => void
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<LibraryKind>('remove_bg')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, LibraryImage>>(new Map())

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // โหลดเฉพาะแท็บที่เปิดอยู่ อีกแท็บยังอยู่ใน cache ถ้าเคยเปิดแล้ว
  const removeBg = useRemoveBgResults({ page: kind === 'remove_bg' ? page : 1, limit: PAGE_SIZE })
  const upscales = useUpscales({ page: kind === 'upscale' ? page : 1, limit: PAGE_SIZE })
  const results = kind === 'remove_bg' ? removeBg : upscales

  const images: LibraryImage[] =
    kind === 'remove_bg'
      ? (removeBg.data?.items ?? []).map((item) => ({
          kind: 'remove_bg' as const,
          id: item.id,
          filename: item.filename,
          format: item.format,
          width: item.width,
          height: item.height,
          sizeBytes: item.sizeBytes,
          previewUrl: item.previewUrl,
          url: item.url,
        }))
      : (upscales.data?.items ?? []).map((item) => ({
          kind: 'upscale' as const,
          id: item.id,
          filename: item.filename,
          format: item.format,
          width: item.width,
          height: item.height,
          sizeBytes: item.sizeBytes,
          previewUrl: item.previewUrl,
          url: item.url,
        }))
  const totalPages = results.data?.pagination.totalPages ?? 1

  function toggle(image: LibraryImage) {
    setSelected((previous) => {
      const next = new Map(previous)
      const key = `${image.kind}/${image.id}`
      if (next.has(key)) next.delete(key)
      else next.set(key, image)
      return next
    })
  }

  function changeKind(next: LibraryKind) {
    setKind(next)
    setPage(1)
  }

  const tabs: { kind: LibraryKind; label: string }[] = [
    { kind: 'remove_bg', label: t('library.tabRemoveBg') },
    { kind: 'upscale', label: t('library.tabUpscale') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-picker-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 id="library-picker-title" className="text-[15px] font-semibold tracking-tight">
            {t('upscale.pickerTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="flex gap-1 border-b border-border px-5 pt-2" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              role="tab"
              aria-selected={kind === tab.kind}
              onClick={() => changeKind(tab.kind)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
                kind === tab.kind
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {results.isPending ? (
            <Loading />
          ) : results.isError && !results.data ? (
            <ErrorState
              message={errorMessage(results.error)}
              error={results.error}
              onRetry={() => void results.refetch()}
            />
          ) : images.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center text-[13px] text-muted-foreground">
              {t('upscale.pickerEmpty')}
            </p>
          ) : (
            <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', results.isPlaceholderData && 'opacity-60')}>
              {images.map((image) => {
                const key = `${image.kind}/${image.id}`
                const checked = selected.has(key)
                const tooLarge = image.sizeBytes > MAX_INPUT_MB * 1024 * 1024
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => toggle(image)}
                      disabled={tooLarge}
                      aria-pressed={checked}
                      className={cn(
                        'relative flex w-full flex-col overflow-hidden rounded-lg border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        checked ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-border-strong',
                      )}
                    >
                      <span
                        className="block aspect-4/3 bg-muted"
                        style={image.format === 'png' ? CHECKERBOARD_STYLE : undefined}
                      >
                        {image.previewUrl ? (
                          <img src={image.previewUrl} alt="" loading="lazy" className="size-full object-contain" />
                        ) : null}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full border',
                          checked ? 'border-primary bg-primary text-white' : 'border-border bg-background/85',
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <span className="block px-2 py-1.5">
                        <span className="block truncate text-[12px] font-medium">{image.filename}</span>
                        <span className="block truncate text-[11px] text-subtle-foreground tabular-nums">
                          {tooLarge
                            ? t('upscale.inputTooLarge', { size: MAX_INPUT_MB })
                            : `${image.width.toLocaleString(intlLocale())}×${image.height.toLocaleString(intlLocale())} · ${formatBytes(image.sizeBytes)}`}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={t('common.previous')}>
                <ChevronLeft className="size-3.5" aria-hidden />
              </Button>
              <span className="font-mono text-[12px] text-subtle-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label={t('common.next')}>
                <ChevronRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {t('upscale.cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={selected.size === 0}
              onClick={() => onSelect([...selected.values()])}
            >
              {selected.size > 0 ? t('upscale.pickerAdd', { count: selected.size }) : t('upscale.pickerNone')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
