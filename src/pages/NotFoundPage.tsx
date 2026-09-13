import { useTranslation } from 'react-i18next'

import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('notFound.title'))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[13px] text-subtle-foreground">404</p>
      <h1 className="text-xl font-semibold tracking-tight">{t('notFound.title')}</h1>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        {t('notFound.body')}
      </p>
      {/* <a> ไม่ใช่ <Link> — หน้าแรกเป็น HTML นิ่งที่อยู่นอก react-router ต้องโหลดหน้าใหม่ */}
      <a
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        {t('notFound.home')}
      </a>
    </div>
  )
}
