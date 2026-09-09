import { SignOutButton } from '@clerk/clerk-react'
import { ArrowRight, LogOut, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { NAV_SECTIONS } from '@/config/nav'
import { siteConfig } from '@/config/site'
import type { Meta } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fullName, type Profile } from '@/types/profile'

type PanelProps = {
  onNavigate?: () => void
  profile: Profile | null
  meta: Meta | null
  /** true = ต่อ API ไม่ติด แสดงสถานะให้รู้แทนที่จะโชว์ช่องว่าง */
  offline: boolean
}

function SidebarPanel({ onNavigate, profile, meta, offline }: PanelProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
        {/* โลโก้พื้นหลังโปร่งใส จึงวางบนพื้นหลังของแอปได้ทั้งโหมดมืดและสว่าง */}
        <img
          src="/logo/mark.png"
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 object-contain"
        />
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-tight font-semibold tracking-tight">
            {siteConfig.name}
          </span>
          <span className="block truncate text-[11px] leading-tight text-subtle-foreground">
            Metadata Studio
          </span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-[0.09em] text-subtle-foreground uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors',
                          isActive
                            ? 'bg-primary-soft font-medium text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 space-y-3 border-t border-border p-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Usage this month
            </span>
            {/* TODO: ยังไม่มี endpoint นับโควตา แสดงขีดไว้ก่อน
                ดีกว่าโชว์ตัวเลขปลอมให้ผู้ใช้เข้าใจผิดว่าใช้ไปเท่านั้นจริง */}
            <span className="font-mono text-[11px] text-subtle-foreground">
              —
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" />
        </div>

        {/* สถานะ provider ตั้งที่ฝั่งเซิร์ฟเวอร์ ไม่ใช่ค่าที่ตั้งในหน้าเว็บ */}
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-border-strong"
        >
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              meta ? 'bg-success' : offline ? 'bg-danger' : 'bg-warning',
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] leading-tight font-medium capitalize">
              {meta ? meta.provider : offline ? 'ต่อเซิร์ฟเวอร์ไม่ติด' : 'กำลังโหลด'}
            </span>
            <span className="block truncate font-mono text-[11px] leading-tight text-subtle-foreground">
              {meta ? meta.model : offline ? 'ตรวจว่า API รันอยู่หรือไม่' : '—'}
            </span>
          </span>
          <ArrowRight
            className="size-3.5 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </NavLink>

        {/* บัญชีผู้ใช้ — ปุ่มขวาคือออกจากระบบ ต่อกับ Clerk ทีหลัง */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
          {profile?.profileUrl ? (
            <img
              src={profile.profileUrl}
              alt=""
              className="size-7 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="size-7 shrink-0 rounded-full bg-muted" />
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] leading-tight font-medium">
              {fullName(profile) || '—'}
            </span>
            <span className="block truncate text-[11px] leading-tight text-subtle-foreground">
              {profile?.email ?? ''}
            </span>
          </span>

          <SignOutButton>
            <button
              type="button"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-3.5" aria-hidden />
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({
  open,
  onClose,
  profile,
  meta,
  offline,
}: {
  open: boolean
  onClose: () => void
  profile: Profile | null
  meta: Meta | null
  offline: boolean
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border lg:block">
        <SidebarPanel profile={profile} meta={meta} offline={offline} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-64 border-r border-border transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="absolute top-3.5 -right-11 flex size-8 items-center justify-center rounded-md bg-card text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
          <SidebarPanel
            onNavigate={onClose}
            profile={profile}
            meta={meta}
            offline={offline}
          />
        </div>
      </div>
    </>
  )
}
