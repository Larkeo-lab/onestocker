import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { errorMessage } from '@/hooks/useAsync'
import { saveSettings, type MetaLanguage } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  KEYWORD_COUNTS,
  parseLanguages,
  type TitleStyle,
  type UserSettings,
} from '@/types/settings'

const controlClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] transition-colors placeholder:text-subtle-foreground hover:border-border-strong focus:border-primary focus:outline-none'

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:gap-6">
      <div className="pt-1.5">
        <p className="text-[13px] font-medium">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function SettingsForm({
  settings,
  languages,
  onSaved,
}: {
  settings: UserSettings
  /** รายการภาษาที่เซิร์ฟเวอร์รองรับ มาจาก GET /meta */
  languages: MetaLanguage[]
  onSaved?: () => void
}) {
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  const pending = state.status === 'saving'

  const selected = new Set<string>(parseLanguages(settings.outputLanguages))
  const primary = languages.find((language) => language.primary)?.code ?? 'en'

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const next: UserSettings = {
      keywordsPerImage: Number(form.get('keywordsPerImage')),
      titleStyle: form.get('titleStyle') as TitleStyle,
      blockedTerms: String(form.get('blockedTerms') ?? ''),
      // checkbox หลายตัวใช้ name เดียวกัน ต้องอ่านด้วย getAll
      outputLanguages: form.getAll('languages').join(','),
    }

    setState({ status: 'saving' })
    try {
      await saveSettings(next)
      setState({ status: 'saved' })
      // โหลดค่าที่บันทึกจริงกลับมา เพราะเซิร์ฟเวอร์จัดรูปแบบให้ใหม่
      // เช่น เรียงภาษาให้ en นำหน้า และตัดคำต้องห้ามที่ซ้ำออก
      onSaved?.()
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) })
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight">
              Generation defaults
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Applied every time you generate metadata
            </p>
          </div>

          <div className="flex items-center gap-3">
            {state.status === 'saved' ? (
              <span className="flex items-center gap-1.5 text-[12px] text-success">
                <CircleCheck className="size-3.5" aria-hidden />
                Saved
              </span>
            ) : null}
            {state.status === 'error' ? (
              <span className="flex items-center gap-1.5 text-[12px] text-danger">
                <TriangleAlert className="size-3.5" aria-hidden />
                {state.message}
              </span>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={pending}
            >
              {pending ? (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              {pending ? 'Saving' : 'Save changes'}
            </Button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <Field label="Keywords per image" hint="Accuracy beats quantity">
            <select
              name="keywordsPerImage"
              className={controlClass}
              defaultValue={String(settings.keywordsPerImage)}
            >
              {KEYWORD_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count} keywords{count === 50 ? ' (maximum)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Title style"
            hint="Descriptive sentences perform best in search"
          >
            <select
              name="titleStyle"
              className={controlClass}
              defaultValue={settings.titleStyle}
            >
              <option value="descriptive">Descriptive sentence</option>
              <option value="concise">Concise phrase</option>
              <option value="commercial">Commercial / marketing</option>
            </select>
          </Field>

          <Field
            label="Output languages"
            hint="English is always produced — Adobe Stock searches in English. Extra languages are added below it."
          >
            {/* checkbox ที่ disabled ไม่ถูกส่งไปกับฟอร์ม จึงต้องมี hidden คู่กัน */}
            <input type="hidden" name="languages" value={primary} />

            <div className="space-y-2">
              {languages.map((language) => (
                <label
                  key={language.code}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors',
                    language.primary
                      ? 'cursor-default border-border bg-muted'
                      : 'cursor-pointer border-border hover:border-border-strong',
                  )}
                >
                  <input
                    type="checkbox"
                    name={language.primary ? undefined : 'languages'}
                    value={language.code}
                    defaultChecked={selected.has(language.code)}
                    disabled={language.primary}
                    className="size-3.5 accent-primary"
                  />
                  <span className="font-medium">{language.name}</span>
                  {language.native !== language.name ? (
                    <span className="text-subtle-foreground">
                      {language.native}
                    </span>
                  ) : null}
                  {language.primary ? (
                    <span className="ml-auto font-mono text-[10px] tracking-wide text-subtle-foreground uppercase">
                      always on
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="Blocked terms"
            hint="Removed from every result, on top of the built-in trademark list"
          >
            <textarea
              name="blockedTerms"
              rows={3}
              className={`${controlClass} resize-y`}
              defaultValue={settings.blockedTerms}
              placeholder="e.g. my-studio, client-name"
              aria-label="Blocked terms"
            />
          </Field>
        </div>
      </section>
    </form>
  )
}
