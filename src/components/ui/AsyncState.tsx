import { LoaderCircle, TriangleAlert } from 'lucide-react'

import { Button } from './Button'

/** ใช้ระหว่างรอข้อมูลจาก API */
export function Loading({ label = 'กำลังโหลด' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-16 text-[13px] text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

/**
 * ใช้เมื่อโหลดข้อมูลไม่สำเร็จ
 * ต้องมีปุ่มลองใหม่เสมอ ไม่งั้นผู้ใช้ต้องรีเฟรชทั้งหน้าเพื่อลองอีกครั้ง
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger/40 bg-danger-soft px-6 py-14 text-center">
      <TriangleAlert className="size-5 text-danger" aria-hidden />
      <p className="mt-3 max-w-md text-[13px] text-danger">{message}</p>
      {onRetry ? (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          ลองใหม่
        </Button>
      ) : null}
    </div>
  )
}
