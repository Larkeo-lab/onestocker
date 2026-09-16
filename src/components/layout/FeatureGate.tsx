import { Ban } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { CONTAINER } from '@/config/container'
import { APP_PATH } from '@/config/site'
import { useCreditCosts } from '@/hooks/queries'
import { cn } from '@/lib/utils'
import { isPageEnabled, type PageFeature } from '@/types/creditCost'

const PATHS: Record<PageFeature, string> = {
  generate: APP_PATH,
  removeBg: `${APP_PATH}/remove-bg`,
}

/**
 * ครอบหน้าของงานที่แอดมินเปิด/ปิดได้ ปิดอยู่แล้วแสดงข้อความแทนตัวหน้า
 *
 * เมนูถูกซ่อนอยู่แล้ว ตัวนี้กันคนที่เข้าจาก bookmark หรือพิมพ์ URL เอง
 * ระหว่างโหลดหรือโหลดไม่สำเร็จแสดงหน้าตามปกติ เหตุผลเดียวกับเมนูใน Sidebar
 */
export function FeatureGate({ feature, children }: { feature: PageFeature; children: ReactNode }) {
  const { t } = useTranslation()
  const enabled = useCreditCosts().data?.enabled

  if (!enabled || isPageEnabled(enabled, feature)) return children

  const names: Record<PageFeature, string> = {
    generate: t('nav.generate'),
    removeBg: t('nav.remove-bg'),
  }
  // พาไปงานอื่นที่ยังเปิดอยู่ ถ้าปิดหมดก็ไม่มีปุ่มให้ไปต่อ
  const other: PageFeature = feature === 'generate' ? 'removeBg' : 'generate'

  return (
    <div className={cn(CONTAINER.wide, 'py-6')}>
      <EmptyState
        icon={Ban}
        title={t('feature.disabledTitle')}
        description={t('feature.disabledBody', { name: names[feature] })}
        action={
          isPageEnabled(enabled, other) ? (
            <Link
              to={PATHS[other]}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t('feature.goTo', { name: names[other] })}
            </Link>
          ) : undefined
        }
      />
    </div>
  )
}
