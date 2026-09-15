import { Check, Copy, Landmark, QrCode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopy } from '@/hooks/useCopy'
import { cn } from '@/lib/utils'
import type { PaymentAccount } from '@/types/payment'

/**
 * รูปจากลิงก์ชั่วคราว โหลดไม่ขึ้นก็แสดงไอคอนแทน
 *
 * ลิงก์หมดอายุใน 1 ชั่วโมง ถ้าโหลดไม่ขึ้นให้ผู้เรียกขอลิงก์ใหม่ (onExpired) หนึ่งครั้ง
 * ไม่เรียกซ้ำ ไม่งั้นรูปที่ไม่มีอยู่จริงจะทำให้ยิงคำขอวนไม่จบ
 */
function AccountImage({
  url,
  icon: Icon,
  className,
  onExpired,
}: {
  url: string | null
  icon: LucideIcon
  className: string
  onExpired: () => void
}) {
  const [broken, setBroken] = useState<string | null>(null)
  const askedForNewUrl = useRef(false)
  const visible = url !== null && url !== broken

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border',
        visible ? 'border-border bg-white' : 'border-dashed border-border-strong bg-muted text-subtle-foreground',
        className,
      )}
    >
      {visible ? (
        <img
          src={url}
          alt=""
          onError={() => {
            setBroken(url)
            if (!askedForNewUrl.current) {
              askedForNewUrl.current = true
              onExpired()
            }
          }}
          className="size-full object-contain"
        />
      ) : (
        <Icon className="size-1/2 max-h-8 max-w-8" aria-hidden />
      )}
    </span>
  )
}

/** บัญชีรับเงินหนึ่งบัญชี กดที่การ์ดเพื่อเลือกว่าโอนเข้าบัญชีนี้ */
export function AccountOption({
  account,
  selected,
  onSelect,
  onImageExpired,
}: {
  account: PaymentAccount
  selected: boolean
  onSelect: () => void
  onImageExpired: () => void
}) {
  const { t } = useTranslation()
  const [copied, copy] = useCopy()

  return (
    <li
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors sm:flex-row',
        selected ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3">
          <AccountImage url={account.logoUrl} icon={Landmark} className="size-11" onExpired={onImageExpired} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {account.accountType}
            </p>
            <p className="truncate text-[14px] font-medium">{account.accountName}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="min-w-0 truncate font-mono text-[15px] font-semibold tracking-wide tabular-nums">
            {account.accountNumber}
          </span>
          <button
            type="button"
            onClick={() => copy(account.accountNumber)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? t('checkout.copied') : t('checkout.copy')}
          </button>
        </div>

        <label className="mt-auto flex cursor-pointer items-center gap-2 pt-4 text-[13px]">
          <input
            type="radio"
            name="payment-account"
            checked={selected}
            onChange={onSelect}
            className="size-4 accent-primary"
          />
          {t('checkout.selectAccount')}
        </label>
      </div>

      {account.qrCodeImageUrl ? (
        // เปิดรูปเต็มในแท็บใหม่ บนมือถือกดค้างเพื่อบันทึกรูปไปสแกนในแอปธนาคารได้
        <a
          href={account.qrCodeImageUrl}
          target="_blank"
          rel="noreferrer"
          title={t('checkout.openQr')}
          className="self-center rounded-lg transition-opacity hover:opacity-85 sm:self-start"
        >
          <AccountImage url={account.qrCodeImageUrl} icon={QrCode} className="size-40 p-1.5" onExpired={onImageExpired} />
        </a>
      ) : (
        <p className="flex items-center gap-1.5 self-center text-[12px] text-subtle-foreground sm:self-start">
          <QrCode className="size-3.5" aria-hidden />
          {t('checkout.noQr')}
        </p>
      )}
    </li>
  )
}
