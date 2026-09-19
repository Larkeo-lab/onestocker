import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleCheck, Clock, LoaderCircle, Send, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { AccountOption } from '@/components/checkout/AccountOption'
import { PaymentHistory } from '@/components/checkout/PaymentHistory'
import { SlipPicker } from '@/components/checkout/SlipPicker'
import { ContactChannelList } from '@/components/quota/ContactChannelList'
import { ErrorState, Loading } from '@/components/ui/AsyncState'
import { Button } from '@/components/ui/Button'
import { CONTAINER } from '@/config/container'
import { intlLocale } from '@/config/i18n'
import { APP_PATH } from '@/config/site'
import { useCheckout } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ApiError, requestSlipUpload, submitPayment, uploadToR2 } from '@/lib/api'
import { errorMessage } from '@/lib/error'
import { formatPaymentAmount, formatUsd } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { Checkout, Payment, PaymentCurrency } from '@/types/payment'
import type { UserType } from '@/types/profile'

const PAID_TYPES: UserType[] = ['PLUS', 'PRO', 'ULTRA']

function isPaidType(value: string | undefined): value is UserType {
  return PAID_TYPES.includes(value as UserType)
}

/**
 * หน้าชำระเงินของแพ็กเกจหนึ่ง (/app/checkout/:plan) เปิดจากการ์ดในป๊อปอัปแพ็กเกจ
 *
 * ขั้นตอน: เลือกสกุล → โอนเข้าบัญชีแล้วเลือกบัญชีที่โอน → แนบสลิป → แจ้งชำระ
 * ทีมงานตรวจสลิปในหน้า Payments ของ admin อนุมัติแล้วเครดิตเข้าเอง
 */
export function CheckoutPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('checkout.title'))
  const { plan } = useParams()

  return (
    <div className={cn(CONTAINER.narrow, 'space-y-6 py-6')}>
      <Link
        to={APP_PATH}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('checkout.back')}
      </Link>

      <header>
        <h1 className="text-[18px] leading-tight font-semibold tracking-tight">{t('checkout.title')}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t('checkout.description')}</p>
      </header>

      {isPaidType(plan) ? (
        // key ต่อแพ็กเกจ เปลี่ยนแพ็กเกจแล้วฟอร์มเริ่มใหม่หมด ไม่ค้างบัญชีหรือสลิปของแพ็กเกจก่อน
        <CheckoutContent key={plan} userType={plan} />
      ) : (
        <ErrorState message={t('plans.empty')} />
      )}

      <PaymentHistory />
    </div>
  )
}

function CheckoutContent({ userType }: { userType: UserType }) {
  const { t } = useTranslation()
  const checkout = useCheckout(userType)
  const [submitted, setSubmitted] = useState<Payment | null>(null)

  if (submitted) {
    return (
      <section className="rounded-xl border border-success/40 bg-success-soft px-5 py-6 text-center">
        <CircleCheck className="mx-auto size-8 text-success" aria-hidden />
        <h2 className="mt-3 text-[15px] font-semibold">{t('checkout.successTitle')}</h2>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{t('checkout.successBody')}</p>
        <Link
          to={APP_PATH}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t('checkout.backToApp')}
        </Link>
      </section>
    )
  }

  if (checkout.isPending) return <Loading label={t('checkout.loading')} />
  if (checkout.isError) {
    return (
      <ErrorState
        message={errorMessage(checkout.error)}
        error={checkout.error}
        onRetry={() => void checkout.refetch()}
      />
    )
  }

  return (
    <CheckoutForm
      checkout={checkout.data}
      onRefresh={() => void checkout.refetch()}
      onSubmitted={setSubmitted}
    />
  )
}

function CheckoutForm({
  checkout,
  onRefresh,
  onSubmitted,
}: {
  checkout: Checkout
  onRefresh: () => void
  onSubmitted: (payment: Payment) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [currency, setCurrency] = useState<PaymentCurrency | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [slip, setSlip] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  /*
    คำนวณจากข้อมูลล่าสุดทุกครั้ง ไม่เก็บตัวเลือกไว้เป็น object
    ข้อมูลถูกโหลดใหม่เป็นระยะ (ลิงก์ QR หมดอายุ) ถ้าแอดมินปิดบัญชีที่เลือกไว้ระหว่างนั้น
    ตัวเลือกจะหลุดเอง ไม่ค้างบัญชีที่ใช้ไม่ได้แล้วไว้บนจอ
  */
  const option = checkout.options.find((item) => item.currency === currency) ?? checkout.options[0]
  const selectedAccountId = option?.accounts.some((account) => account.id === accountId)
    ? accountId
    : option?.accounts.length === 1
      ? option.accounts[0].id
      : null

  const summary =
    checkout.credits === null
      ? t('checkout.creditsUnlimited', { days: checkout.periodDays })
      : t('checkout.credits', {
          credits: checkout.credits.toLocaleString(intlLocale()),
          days: checkout.periodDays,
        })

  async function onSubmit() {
    if (!option) return
    if (!selectedAccountId) {
      setError(t('checkout.needAccount'))
      return
    }
    if (!slip) {
      setError(t('checkout.needSlip'))
      return
    }

    setSubmitting(true)
    setError(undefined)
    try {
      const upload = await requestSlipUpload(slip.type)
      await uploadToR2(upload.url, slip)
      const payment = await submitPayment({
        userType: checkout.userType,
        currency: option.currency,
        amount: option.amount,
        bankAccountId: selectedAccountId,
        slipKey: upload.key,
      })
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
      onSubmitted(payment)
    } catch (cause) {
      // 409 = ราคา เรท หรือบัญชีเปลี่ยน หรือมีรายการรอตรวจอยู่แล้ว โหลดใหม่ให้เห็นข้อมูลปัจจุบัน
      if (cause instanceof ApiError && cause.status === 409) {
        setError(t('checkout.conflict'))
        onRefresh()
      } else {
        setError(errorMessage(cause))
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* สรุปแพ็กเกจ */}
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold">{t('checkout.plan', { plan: checkout.userType })}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{summary}</p>
        </div>
        <p className="text-[22px] font-semibold tracking-tight tabular-nums">
          {formatUsd(checkout.price)}
          <span className="ml-1 text-[12.5px] font-normal text-muted-foreground">{t('plans.perPeriod')}</span>
        </p>
      </section>

      {checkout.pending ? (
        <section className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft px-5 py-4">
          <Clock className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="text-[13.5px] font-semibold text-warning">{t('checkout.pendingTitle')}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {t('checkout.pendingBody', {
                plan: checkout.pending.userType,
                amount: formatPaymentAmount(checkout.pending.amount, checkout.pending.currency),
              })}
            </p>
          </div>
        </section>
      ) : !option ? (
        <section className="space-y-4 rounded-xl border border-dashed border-border-strong px-5 py-6 text-center">
          <p className="text-[13px] text-muted-foreground">{t('checkout.noOptions')}</p>
          <ContactChannelList />
        </section>
      ) : (
        <>
          {/* 1. สกุลเงิน */}
          <section>
            <h2 className="text-[13px] font-semibold">{t('checkout.stepCurrency')}</h2>
            {checkout.options.length > 1 ? (
              <div role="radiogroup" className="mt-2 inline-flex rounded-lg border border-border bg-muted p-0.5">
                {checkout.options.map((item) => (
                  <button
                    key={item.currency}
                    type="button"
                    role="radio"
                    aria-checked={item.currency === option.currency}
                    onClick={() => {
                      setCurrency(item.currency)
                      setError(undefined)
                    }}
                    disabled={submitting}
                    className={cn(
                      'h-8 rounded-md px-3.5 text-[13px] font-medium transition-colors',
                      item.currency === option.currency
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.currency === 'LAK' ? t('checkout.currencyLAK') : t('checkout.currencyUSD')}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-3 rounded-xl border border-border bg-card px-5 py-4">
              <p className="text-[12px] text-muted-foreground">{t('checkout.amount')}</p>
              <p className="mt-0.5 text-[28px] leading-tight font-semibold tracking-tight tabular-nums">
                {formatPaymentAmount(option.amount, option.currency)}
              </p>
              {option.unitsPerUsd !== null ? (
                <p className="mt-1 text-[12px] text-subtle-foreground">
                  {t('checkout.rateNote', {
                    price: formatUsd(checkout.price),
                    rate: option.unitsPerUsd.toLocaleString(intlLocale()),
                  })}
                </p>
              ) : null}
            </div>
          </section>

          {/* 2. บัญชี */}
          <section>
            <h2 className="text-[13px] font-semibold">{t('checkout.stepAccount')}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t('checkout.stepAccountHint')}</p>
            <ul className="mt-3 space-y-3">
              {option.accounts.map((account) => (
                <AccountOption
                  key={account.id}
                  account={account}
                  selected={account.id === selectedAccountId}
                  onSelect={() => {
                    setAccountId(account.id)
                    setError(undefined)
                  }}
                  onImageExpired={onRefresh}
                />
              ))}
            </ul>
          </section>

          {/* 3. สลิป */}
          <section>
            <h2 className="text-[13px] font-semibold">{t('checkout.stepSlip')}</h2>
            <div className="mt-3">
              <SlipPicker
                onChange={(file) => {
                  setSlip(file)
                  setError(undefined)
                }}
                disabled={submitting}
              />
            </div>
          </section>

          {error ? (
            <p className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <Button variant="primary" className="w-full sm:w-auto" onClick={() => void onSubmit()} disabled={submitting}>
            {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            {submitting ? t('checkout.submitting') : t('checkout.submit')}
          </Button>
        </>
      )}
    </div>
  )
}
