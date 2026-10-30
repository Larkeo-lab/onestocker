import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { THEME_PREFERENCES, useTheme, type ThemePreference } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const ICONS: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }

/** ปุ่มบน header สลับสว่าง / มืด กดครั้งเดียวจบ อยากกลับไปตามระบบเลือกในเมนูโปรไฟล์ (ThemeSelect) */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setPreference } = useTheme()
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark')
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

/** เลือกธีม สว่าง / มืด / ตามระบบ แบบปุ่มแบ่งช่อง จำไว้ในเครื่อง */
export function ThemeSelect({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className={cn('grid grid-cols-3 gap-1 rounded-md border border-border bg-muted p-0.5', className)}
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option]
        const selected = option === preference
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option)}
            className={cn(
              'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] text-[12px] font-medium transition-colors',
              selected
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {t(`theme.${option}`)}
          </button>
        )
      })}
    </div>
  )
}
