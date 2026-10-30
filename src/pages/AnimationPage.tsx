import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { AnimationHistoryCard } from '@/components/animation/AnimationHistoryCard'
import { AnimationRenderTab } from '@/components/animation/AnimationRenderTab'
import { AnimationVideoTab } from '@/components/animation/AnimationVideoTab'
import { HistorySection } from '@/components/library/HistorySection'
import { CONTAINER } from '@/config/container'
import { useAnimationHistory } from '@/hooks/queries'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { useAnimationStore } from '@/store/animation'
import { useVideoStore } from '@/store/animationVideo'

/**
 * หน้าแอนิเมชัน: หัวข้อ แถบแท็บ เนื้อหาของแท็บที่เลือก แล้วประวัติด้านล่าง
 *
 * แท็บแรกสร้างจากวิดีโอตัวอย่างด้วย AI (AnimationVideoTab)
 * แท็บที่สอง (?tab=render) วางโค้ด HTML เองแล้ว render ไม่ผ่าน AI (AnimationRenderTab)
 * งานอยู่ใน store ไปหน้าอื่นหรือสลับแท็บแล้วกลับมายังเห็นงานเดิม รีเฟรชหน้าก็ถามสถานะต่อ
 * ด้านล่างเป็นประวัติ กดรายการไหนไปหน้าของรายการนั้น (AnimationDetailPage)
 */

const NO_HIDDEN: ReadonlySet<string> = new Set()

export function AnimationPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('nav.animation'))
  const resume = useAnimationStore((store) => store.resume)
  const history = useAnimationHistory()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'render' ? 'render' : 'video'
  const tabs = [
    { id: 'video', label: t('animation.tabVideo') },
    { id: 'render', label: t('animation.tabRender') },
  ] as const

  // งานที่ส่งไว้ก่อนรีเฟรชหน้า (สร้างแอนิเมชัน และ render MP4 ที่กดไว้)
  const resumeVideos = useVideoStore((store) => store.resume)
  useEffect(resume, [resume])
  useEffect(resumeVideos, [resumeVideos])

  return (
    <div className={cn(CONTAINER.wide, 'space-y-8 py-6')}>
      <header>
        <h1 className="text-[15px] leading-tight font-semibold tracking-tight">{t('nav.animation')}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t('animation.description')}</p>
      </header>

      <div className="-mt-4 flex gap-1 border-b border-border" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setSearchParams(item.id === 'render' ? { tab: 'render' } : {}, { replace: true })}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors',
              tab === item.id
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'render' ? <AnimationRenderTab /> : <AnimationVideoTab />}

      <HistorySection
        title={t('animation.historyTitle')}
        query={history}
        hide={NO_HIDDEN}
        renderItem={(item) => <AnimationHistoryCard key={item.id} item={item} />}
      />
    </div>
  )
}
