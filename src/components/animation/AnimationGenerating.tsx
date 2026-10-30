import { Code2, Eye, Film, ScanSearch, Upload, type LucideIcon } from 'lucide-react'

/** ขั้นที่ฉากแสดง ตรงกับ STEPS ในหน้าแอนิเมชัน */
export type GeneratingStep = 'upload' | 'analyzing' | 'coding' | 'checking' | 'rendering'

const ICONS: Record<GeneratingStep, LucideIcon> = {
  upload: Upload,
  analyzing: Eye,
  coding: Code2,
  checking: ScanSearch,
  rendering: Film,
}

/**
 * ฉาก 16:9 ระหว่างรอสร้างแอนิเมชัน แทนไอคอนหมุน แสงสีลอยวน วงคลื่นออกจากไอคอนของขั้นที่ทำอยู่
 * ขั้นดูวิดีโอกับขั้นตรวจมีเส้นสแกนกวาด percent มีค่า = แสดงแถบความคืบหน้า (อัปโหลด render)
 *
 * ผู้ใช้ที่ตั้งลดการเคลื่อนไหวไว้เห็นฉากนิ่ง (motion-safe)
 */
export function AnimationGenerating({ step, label, percent }: { step: GeneratingStep; label: string; percent?: number }) {
  const Icon = ICONS[step]
  const scanning = step === 'analyzing' || step === 'checking'
  return (
    <div
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-[#05070f]"
      role="status"
      aria-live="polite"
    >
      <div className="absolute -top-1/4 -left-1/6 size-3/4 rounded-full bg-primary/35 blur-3xl motion-safe:animate-stage-drift" />
      <div className="absolute -right-1/6 -bottom-1/4 size-3/4 rounded-full bg-violet-500/30 blur-3xl motion-safe:animate-stage-drift [animation-delay:-4.5s]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {scanning ? (
        <div className="absolute inset-x-0 h-px bg-linear-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_16px_2px] shadow-sky-400/60 motion-safe:animate-stage-scan" />
      ) : null}

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative flex size-16 items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <span
              key={ring}
              className="absolute inset-0 rounded-full border border-sky-300/60 motion-safe:animate-stage-ripple"
              style={{ animationDelay: `${ring}s` }}
            />
          ))}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
            <Icon className="size-7 text-sky-100 drop-shadow-[0_0_8px_rgb(125_211_252)]" aria-hidden />
          </span>
        </div>
        <p className="text-[14px] font-medium tracking-tight text-white/90">{label}</p>
        {percent !== undefined ? (
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-linear-to-r from-sky-400 to-violet-400 transition-[width] duration-500"
              style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
