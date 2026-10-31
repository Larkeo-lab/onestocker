import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ANIMATION_MAX_SECONDS, ANIMATION_MIN_SECONDS } from '@/lib/api/animation'
import { useCreditCosts } from '@/hooks/queries'
import { animationActionEnabled } from '@/lib/creditCosts'
import { cn } from '@/lib/utils'
import {
  BACKGROUND_PRESETS,
  downloadLengths,
  effectiveOptions,
  lengthFor,
  VIDEO_FORMATS,
  VIDEO_FPS,
  VIDEO_QUALITIES,
  VIDEO_RESOLUTIONS,
  type VideoChoice,
  type VideoFormat,
  type VideoFps,
  type VideoQuality,
  type VideoResolution,
} from '@/lib/videoFormats'
import type { AnimationCreditAction } from '@/types/creditCost'

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] font-medium text-foreground shadow-xs transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60'

const LABEL_CLASS = 'text-[12.5px] font-medium'

const FORMAT_ACTION: Record<VideoFormat, AnimationCreditAction> = {
  mp4: 'animation_mp4',
  prores: 'animation_prores',
  prores_alpha: 'animation_prores_alpha',
}

const BACKGROUND_LABELS = {
  '': 'animation.format.backgroundSource',
  '#000000': 'animation.format.background000000',
  '#ffffff': 'animation.format.backgroundffffff',
  '#00b140': 'animation.format.background00b140',
} as const satisfies Record<(typeof BACKGROUND_PRESETS)[number], string>
const HINT_CLASS = 'block text-[11.5px] text-subtle-foreground'

/**
 * เลือกไฟล์ที่จะดาวน์โหลด: ชนิดไฟล์ เฟรมต่อวินาที ความละเอียด พื้นหลัง และคุณภาพ ตัวอย่างข้างบนเปลี่ยนตามทันที (แบบโปร่งใสแสดงบนลายตาราง)
 * ไม่ต้อง render render จริงตอนกดดาวน์โหลด (VideoDownloadButton) แต่ละแบบ render แยกกัน
 *
 * ตัวอย่างสดเล่นตามจอ (ปกติ 60 fps) fps ที่เลือกมีผลกับไฟล์ที่ได้เท่านั้น
 *
 * seconds = แสดงแถบเลือกความยาวด้วย (แท็บ Render โค้ดที่เลือกทุกอย่างพร้อมกันตอนดาวน์โหลด)
 * clipSeconds = คลิปที่สร้างแล้ว เลือกความยาวไฟล์เป็นผลคูณของลูปคลิป (downloadLengths) เก็บใน value.seconds
 *
 * inline = เรียงทุกช่องเป็นแถวเดียวต่อกัน จอแคบขึ้นบรรทัดใหม่เอง actions (ปุ่ม) ต่อท้ายแถว
 * คำอธิบายของแต่ละช่องรวมไว้ใต้แถว ไม่งั้นช่องในแถวสูงไม่เท่ากัน
 */
export function FormatSelect({
  value,
  onChange,
  disabled,
  seconds,
  clipSeconds,
  inline = false,
  actions,
}: {
  value: VideoChoice
  onChange: (choice: VideoChoice) => void
  disabled?: boolean
  seconds?: { value: number; onChange: (seconds: number) => void; hint?: string }
  clipSeconds?: number
  inline?: boolean
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  // รายการที่แอดมินปิดอยู่ (ตั้งค่าเครดิต) ตัวเลือกนั้นเห็นแต่กดไม่ได้
  const { data: costs } = useCreditCosts()
  const off = (action: AnimationCreditAction) => !animationActionEnabled(costs, action)
  const formatHint = [
    t(`animation.format.${value.format}Hint`),
    clipSeconds ? t('animation.seconds.loopHint', { seconds: clipSeconds }) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const formatField = (
    <label className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.format.label')}</span>
      <select
        value={value.format}
        onChange={(event) => onChange({ ...value, format: event.target.value as VideoFormat })}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        {VIDEO_FORMATS.map((format) => (
          <option key={format} value={format} disabled={off(FORMAT_ACTION[format])}>
            {t(`animation.format.${format}`)}
          </option>
        ))}
      </select>
    </label>
  )

  const fpsField = (
    <label className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.format.fpsLabel')}</span>
      <select
        value={value.fps}
        onChange={(event) => onChange({ ...value, fps: Number(event.target.value) as VideoFps })}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        {VIDEO_FPS.map((fps) => (
          <option key={fps} value={fps} disabled={fps === 120 && off('animation_fps_120')}>
            {t('animation.format.fps', { fps })}
          </option>
        ))}
      </select>
    </label>
  )

  const effective = effectiveOptions(value)
  const presetBackground = (BACKGROUND_PRESETS as readonly string[]).includes(effective.background)

  const resolutionField = (
    <label className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.format.resolutionLabel')}</span>
      <select
        value={effective.resolution}
        onChange={(event) => onChange({ ...value, resolution: Number(event.target.value) as VideoResolution })}
        disabled={disabled}
        className={SELECT_CLASS}
      >
        {VIDEO_RESOLUTIONS.map((resolution) => (
          <option
            key={resolution}
            value={resolution}
            disabled={(resolution === 1440 && off('animation_1440')) || (resolution === 2160 && off('animation_2160'))}
          >
            {t(`animation.format.resolution${resolution}`)}
          </option>
        ))}
      </select>
    </label>
  )

  // แบบโปร่งใสไม่มีสีพื้นหลัง ล็อกไว้ที่ "โปร่งใส" แบบเดียวกับเซิร์ฟเวอร์ (specOf)
  const backgroundField = (
    <div className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.format.backgroundLabel')}</span>
      <div className="flex gap-2">
        <select
          value={value.format === 'prores_alpha' ? 'transparent' : presetBackground ? effective.background : 'custom'}
          onChange={(event) =>
            onChange({ ...value, background: event.target.value === 'custom' ? '#ff5500' : event.target.value })
          }
          disabled={disabled || value.format === 'prores_alpha'}
          aria-label={t('animation.format.backgroundLabel')}
          className={SELECT_CLASS}
        >
          {value.format === 'prores_alpha' ? (
            <option value="transparent">{t('animation.format.backgroundTransparent')}</option>
          ) : null}
          {BACKGROUND_PRESETS.map((color) => (
            <option key={color} value={color}>
              {t(BACKGROUND_LABELS[color])}
            </option>
          ))}
          <option value="custom">{t('animation.format.backgroundCustom')}</option>
        </select>
        {value.format !== 'prores_alpha' && effective.background ? (
          <input
            type="color"
            value={effective.background}
            onChange={(event) => onChange({ ...value, background: event.target.value })}
            disabled={disabled}
            aria-label={t('animation.format.backgroundCustom')}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
          />
        ) : null}
      </div>
    </div>
  )

  // ProRes คุณภาพคงที่ ล็อกไว้
  const qualityField = (
    <label className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.format.qualityLabel')}</span>
      <select
        value={value.format === 'mp4' ? effective.quality : 'fixed'}
        onChange={(event) => onChange({ ...value, quality: event.target.value as VideoQuality })}
        disabled={disabled || value.format !== 'mp4'}
        className={SELECT_CLASS}
      >
        {value.format === 'mp4' ? (
          VIDEO_QUALITIES.map((quality) => (
            <option
              key={quality}
              value={quality}
              disabled={(quality === 'max' && off('animation_quality_max')) || (quality === 'lossless' && off('animation_quality_lossless'))}
            >
              {t(`animation.format.quality_${quality}`)}
            </option>
          ))
        ) : (
          <option value="fixed">{t('animation.format.qualityFixed')}</option>
        )}
      </select>
    </label>
  )

  // ลูปยาวจนคูณไม่ได้ (เกิน 15 วินาที) มีความยาวเดียว ยังแสดงไว้ให้รู้ว่าไฟล์ยาวเท่าไร
  const lengthField = clipSeconds ? (
    <label className="block space-y-1.5">
      <span className={LABEL_CLASS}>{t('animation.seconds.label')}</span>
      <select
        value={lengthFor({ seconds: clipSeconds }, value)}
        onChange={(event) => onChange({ ...value, seconds: Number(event.target.value) })}
        disabled={disabled || downloadLengths(clipSeconds).length === 1}
        className={SELECT_CLASS}
      >
        {downloadLengths(clipSeconds).map((length) => (
          <option key={length} value={length} disabled={length > 10 && off('animation_extra_10s')}>
            {t('animation.seconds.value', { seconds: length })}
          </option>
        ))}
      </select>
    </label>
  ) : null

  if (inline) {
    return (
      <div className="space-y-2">
        {/* basis กำหนดความกว้างขั้นต่ำก่อนขึ้นบรรทัดใหม่ grow ให้ช่องที่ยาวกว่าได้ที่มากกว่า */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {seconds ? (
            <div className="min-w-0 flex-[2_1_14rem]">
              <SecondsRange {...seconds} disabled={disabled} compact />
            </div>
          ) : null}
          <div className="min-w-0 flex-[2_1_16rem]">{formatField}</div>
          <div className="min-w-0 flex-[1_1_7rem]">{fpsField}</div>
          {lengthField ? <div className="min-w-0 flex-[1_1_7rem]">{lengthField}</div> : null}
          <div className="min-w-0 flex-[1_1_10rem]">{resolutionField}</div>
          <div className="min-w-0 flex-[1_1_12rem]">{backgroundField}</div>
          <div className="min-w-0 flex-[1_1_11rem]">{qualityField}</div>
          {actions ? <div className="min-w-0 flex-[2_1_14rem]">{actions}</div> : null}
        </div>
        <span className={HINT_CLASS}>{[seconds?.hint, formatHint].filter(Boolean).join(' · ')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {seconds ? <SecondsRange {...seconds} disabled={disabled} /> : null}
      <div className="space-y-1.5">
        <div className={cn('grid gap-2', lengthField ? 'grid-cols-[minmax(0,1fr)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_auto]')}>
          {formatField}
          {fpsField}
          {lengthField}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {resolutionField}
          {qualityField}
          <div className="col-span-2">{backgroundField}</div>
        </div>
        <span className={HINT_CLASS}>{formatHint}</span>
      </div>
    </div>
  )
}

/**
 * เลือกความยาวคลิป (วินาที) ด้วยแถบเลื่อน ใช้ในแท็บ Render โค้ด โค้ดที่วางต้องวนลูปพอดีความยาวนี้
 * คลิปที่ AI สร้างลูป 10 วินาทีเสมอ ความยาวไฟล์เลือกตอนดาวน์โหลด (FormatSelect แบบ clipSeconds)
 *
 * compact = สูงเท่าช่อง select (h-9) ไม่มีคำอธิบายและตัวเลขต่ำสุดสูงสุด ใช้ในแถวของ FormatSelect แบบ inline
 */
export function SecondsRange({
  value,
  onChange,
  disabled,
  hint,
  compact = false,
}: {
  value: number
  onChange: (seconds: number) => void
  disabled?: boolean
  /** ข้อความใต้แถบ ไม่ใส่ = คำอธิบายของขั้นสร้างด้วย AI */
  hint?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <label className="block space-y-1.5">
      <span className={cn('flex items-center justify-between', LABEL_CLASS)}>
        {t('animation.seconds.label')}
        <span className="font-mono text-primary tabular-nums">{t('animation.seconds.value', { seconds: value })}</span>
      </span>
      <input
        type="range"
        min={ANIMATION_MIN_SECONDS}
        max={ANIMATION_MAX_SECONDS}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className={cn('w-full accent-primary disabled:opacity-60', compact && 'h-9')}
      />
      {compact ? null : (
        <>
          <span className="flex justify-between text-[11px] text-subtle-foreground tabular-nums">
            <span>{t('animation.seconds.value', { seconds: ANIMATION_MIN_SECONDS })}</span>
            <span>{t('animation.seconds.value', { seconds: ANIMATION_MAX_SECONDS })}</span>
          </span>
          <span className={HINT_CLASS}>{hint ?? t('animation.seconds.hint')}</span>
        </>
      )}
    </label>
  )
}
