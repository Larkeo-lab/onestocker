import { SignOutButton, useUser } from '@clerk/clerk-react'
import { Eye, EyeOff, KeyRound, LoaderCircle, LogOut } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { useMe } from '@/hooks/queries'
import { ApiError, SIGNUP_DEVICE_LIMIT_CODE } from '@/lib/api'

import { AuthWordmark } from './AuthWordmark'
import { SignupBlocked } from './SignupBlocked'

/** ความยาวขั้นต่ำเท่ากับค่าเริ่มต้นของ Clerk ตรวจก่อนส่งจะได้บอกได้ทันที Clerk ยังตรวจซ้ำ (เช่น รหัสที่เคยรั่ว) */
const MIN_PASSWORD_LENGTH = 8

/**
 * บังคับตั้งรหัสผ่านก่อนเข้าใช้ สำหรับบัญชีที่ยังไม่มีรหัสผ่าน (สมัครด้วย Google)
 *
 * กล่องสมัครของ Clerk ไม่ถามรหัสผ่านเมื่อสมัครด้วย Google และตั้งให้บังคับใน Dashboard ไม่ได้
 * จึงถามตรงนี้ทันทีหลังสมัคร ใส่แล้วล็อกอินด้วยอีเมลกับรหัสผ่านได้ด้วย (เช่น ในโปรแกรม OneStock Studio)
 * บัญชีที่มีรหัสผ่านแล้วผ่านไปเลย ไม่เห็นหน้านี้
 *
 * รอคำตอบ /auth/me ก่อน (ใช้ cache ชุดเดียวกับ AppShell) ถ้าเครื่องนี้สมัครเกินเพดาน เซิร์ฟเวอร์ลบบัญชีทิ้งแล้ว
 * จะได้บอกเหตุผลเลย ไม่ใช่ให้ตั้งรหัสผ่านก่อนแล้วค่อยรู้ว่าบัญชีถูกลบ
 */
export function RequirePassword({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { user } = useUser()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const me = useMe()

  if (me.error instanceof ApiError && me.error.code === SIGNUP_DEVICE_LIMIT_CODE) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
        <AuthWordmark />
        <SignupBlocked signedIn />
      </div>
    )
  }
  if (!user || user.passwordEnabled) return children
  // ยังไม่รู้ผลจากเซิร์ฟเวอร์ ไม่ให้ตั้งรหัสผ่านไปก่อน ถ้าถามไม่ได้ (error อื่น) ให้ AppShell จัดการต่อ
  if (me.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <AuthWordmark />
      </div>
    )
  }
  if (me.isError) return children

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.setPassword.tooShort', { min: MIN_PASSWORD_LENGTH }))
      return
    }
    if (password !== confirm) {
      setError(t('auth.setPassword.mismatch'))
      return
    }
    setSaving(true)
    setError(undefined)
    try {
      // บัญชีที่ยังไม่มีรหัสผ่านไม่ต้องใส่รหัสเดิม เสร็จแล้ว user.passwordEnabled เป็น true หน้านี้จะหายเอง
      await user.updatePassword({ newPassword: password, signOutOfOtherSessions: false })
      await user.reload()
    } catch (cause) {
      setError(clerkMessage(cause) ?? t('auth.setPassword.failed'))
      setSaving(false)
    }
  }

  const inputClass =
    'h-10 w-full rounded-md border border-border bg-background px-3 pr-10 text-[13.5px] transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:outline-none'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12">
      <AuthWordmark />
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold">{t('auth.setPassword.title')}</h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {t('auth.setPassword.body', { email: user.primaryEmailAddress?.emailAddress ?? '' })}
            </p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[12.5px] font-medium">{t('auth.setPassword.password')}</span>
          <span className="relative block">
            <input
              type={visible ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError(undefined)
              }}
              autoComplete="new-password"
              autoFocus
              required
              disabled={saving}
              className={inputClass}
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

        <label className="block space-y-1.5">
          <span className="text-[12.5px] font-medium">{t('auth.setPassword.confirm')}</span>
          <input
            type={visible ? 'text' : 'password'}
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setError(undefined)
            }}
            autoComplete="new-password"
            required
            disabled={saving}
            className={inputClass}
          />
        </label>

        {error ? (
          <p role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {t('auth.setPassword.submit')}
        </Button>

        <SignOutButton>
          <button
            type="button"
            className="mx-auto flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden />
            {t('auth.setPassword.signOut')}
          </button>
        </SignOutButton>
      </form>
    </div>
  )
}

/** ข้อความจาก Clerk (เช่น รหัสผ่านเคยรั่ว หรือง่ายเกินไป) Clerk แปลตามภาษาที่ตั้งไว้แล้ว ไม่มี = undefined */
function clerkMessage(cause: unknown): string | undefined {
  const errors = (cause as { errors?: { longMessage?: string; message?: string }[] })?.errors
  return errors?.[0]?.longMessage ?? errors?.[0]?.message
}
