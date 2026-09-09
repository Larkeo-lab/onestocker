import { Link } from 'react-router-dom'

import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('ไม่พบหน้านี้')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[13px] text-subtle-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">ไม่พบหน้านี้</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        กลับหน้าแรก
      </Link>
    </div>
  )
}
