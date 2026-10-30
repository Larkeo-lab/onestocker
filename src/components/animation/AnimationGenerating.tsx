import { BrandLoader } from '@/components/ui/BrandLoader'

/**
 * กรอบ 16:9 ระหว่างรอสร้างหรือ render แอนิเมชัน ใช้ BrandLoader (ชื่อแอปเป็นคลื่น)
 * ตัวเดียวกับหน้าเข้าสู่ระบบ ลบพื้นหลัง และอัปสเกล ทั้งแอปจึงบอกว่ากำลังทำงานแบบเดียวกัน
 *
 * label = ขั้นที่ทำอยู่ percent มีค่า = แสดงแถบความคืบหน้า (อัปโหลด render)
 * ผู้ใช้ที่ตั้งลดการเคลื่อนไหวไว้เห็นตัวหนังสือนิ่ง (ดู BrandLoader)
 */
export function AnimationGenerating({ label, percent }: { label: string; percent?: number }) {
  return (
    <div
      className="flex aspect-video w-full flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card px-6 text-center"
      aria-live="polite"
    >
      {/* กรอบ 16:9 กว้าง ใช้ตัวใหญ่กว่าในการ์ดของลบพื้นหลัง ย่อตามจอแคบ */}
      <BrandLoader label={label} textClassName="text-[32px] sm:text-[44px] lg:text-[56px]" />
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      {percent !== undefined ? (
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}
