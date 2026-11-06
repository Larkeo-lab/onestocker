import { useSignIn } from '@clerk/clerk-react'
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { APP_PATH, SIGN_IN_PATH } from '@/config/site'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { env } from '@/lib/env'

/** ความยาวขั้นต่ำเท่ากับค่าเริ่มต้นของ Clerk ตรวจก่อนส่ง Clerk ยังตรวจซ้ำ (เช่น รหัสที่เคยรั่ว) */
const MIN_PASSWORD_LENGTH = 8

const inputClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-[13.5px] transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:outline-none'

/**
 * ลืมรหัสผ่าน: กรอกอีเมล → Clerk ส่งรหัส OTP ทางอีเมล → กรอกรหัสกับรหัสผ่านใหม่ → เข้าสู่ระบบเลย
 *
 * กล่องเข้าสู่ระบบของ Clerk มีลิงก์ลืมรหัสผ่านเหมือนกัน แต่โผล่หลังกรอกอีเมลแล้วเท่านั้น หาไม่เจอ
 * หน้านี้จึงเปิดได้จากลิงก์ใต้กล่องเข้าสู่ระบบโดยตรง ใช้ขั้นตอนเดียวกับของ Clerk (reset_password_email_code)
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('auth.forgot.title'))
  if (env.authDevBypass) return null
  return <ForgotPasswordForm />
}

function ForgotPasswordForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, setActive, isLoaded } = useSignIn()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    if (!isLoaded || !signIn) return
    setBusy(true)
    setError(undefined)
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() })
      setStep('code')
      setNotice(t('auth.forgot.sent', { email: email.trim() }))
    } catch (cause) {
      setError(clerkMessage(cause) ?? t('auth.forgot.sendFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.setPassword.tooShort', { min: MIN_PASSWORD_LENGTH }))
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate(APP_PATH, { replace: true })
        return
      }
      // เปิดยืนยันสองขั้นตอนไว้ รหัสผ่านเปลี่ยนแล้ว ให้เข้าสู่ระบบตามปกติ
      setNotice(t('auth.forgot.changedSignIn'))
      navigate(SIGN_IN_PATH, { replace: true })
    } catch (cause) {
      setError(clerkMessage(cause) ?? t('auth.forgot.resetFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          {step === 'email' ? <Mail className="size-4" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold">{t('auth.forgot.title')}</h1>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {step === 'email' ? t('auth.forgot.emailHint') : notice}
          </p>
        </div>
      </div>

      {step === 'email' ? (
        <form onSubmit={(event) => void sendCode(event)} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[12.5px] font-medium">{t('auth.forgot.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError(undefined)
              }}
              autoComplete="email"
              autoFocus
              required
              disabled={busy}
              className={inputClass}
            />
          </label>
          {error ? (
            <p role="alert" className="text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={busy || !isLoaded}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {t('auth.forgot.send')}
          </Button>
        </form>
      ) : (
        <form onSubmit={(event) => void reset(event)} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[12.5px] font-medium">{t('auth.forgot.code')}</span>
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError(undefined)
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              disabled={busy}
              className={`${inputClass} text-center font-mono tracking-[0.4em]`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12.5px] font-medium">{t('auth.forgot.newPassword')}</span>
            <span className="relative block">
              <input
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(undefined)
                }}
                autoComplete="new-password"
                required
                disabled={busy}
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={t(visible ? 'auth.setPassword.hide' : 'auth.setPassword.show')}
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </span>
            <span className="block text-[11.5px] text-subtle-foreground">
              {t('auth.setPassword.hint', { min: MIN_PASSWORD_LENGTH })}
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={busy || code.length < 6}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {t('auth.forgot.reset')}
          </Button>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="mx-auto block text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('auth.forgot.resend')}
          </button>
        </form>
      )}

      <Link
        to={SIGN_IN_PATH}
        className="mx-auto flex w-fit items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('auth.forgot.back')}
      </Link>
    </div>
  )
}

/** ข้อความจาก Clerk (เช่น ไม่พบอีเมลนี้ รหัสผิด รหัสผ่านเคยรั่ว) ไม่มี = undefined */
function clerkMessage(cause: unknown): string | undefined {
  const errors = (cause as { errors?: { longMessage?: string; message?: string }[] })?.errors
  return errors?.[0]?.longMessage ?? errors?.[0]?.message
}
