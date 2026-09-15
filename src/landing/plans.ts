import { env } from '@/lib/env'

/**
 * การ์ดแพ็กเกจในส่วนราคาของหน้า landing
 *
 * หน้า landing เป็น HTML นิ่งที่ build ไว้ก่อน ราคาและรายละเอียดของแพ็กเกจแอดมินแก้ได้ตลอด
 * จึงดึงจาก GET /api/public/plans ตอนเปิดหน้า แล้ววาดการ์ดแทนกล่องว่างที่ LandingPage.tsx วางไว้
 *
 * หน้าตาต้องตรงกับ PlanCard ใน components/plans/PlansDialog.tsx
 * เขียนด้วย DOM ตรง ๆ ไม่ใช้ React เพราะหน้า landing บนเว็บจริงไม่ได้โหลด React เลย
 * ข้อความของแอดมินใส่ผ่าน textContent เสมอ ห้ามใช้ innerHTML กับค่าจากเซิร์ฟเวอร์
 */

/** ข้อความที่ LandingPage.tsx ฝังไว้ใน <script data-plans-text> ต้องมีฟิลด์ตรงกัน */
type PlanTexts = {
  language: 'th' | 'en' | 'lo'
  locale: string
  signUpPath: string
  checkoutPath: string
  appPath: string
  recommended: string
  free: string
  noPrice: string
  perPeriod: string
  creditsFree: string
  creditsPaid: string
  creditsUnlimited: string
  startFree: string
  choose: string
  contact: string
  creditsToken: string
  planToken: string
}

type LocalizedText = { th: string; en: string; lo: string }

/** ต้องตรงกับ Plan ใน server/internal/feature/quota/dto.go */
type Plan = {
  userType: string
  monthlyLimit: number | null
  monthlyPrice: number | null
  description: LocalizedText
  features: { title: LocalizedText; description: LocalizedText }[]
  recommended: boolean
}

const primaryButton =
  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover hover:-translate-y-0.5 shadow-xs hover:shadow-md'

const secondaryButton =
  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 ease-out hover:border-border-strong hover:bg-muted hover:-translate-y-0.5'

// ไอคอนเดียวกับ lucide (Check, Star) เป็นค่าคงที่ของเราเอง ใส่ด้วย innerHTML ได้
const ICON_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
const ICON_STAR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>'

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function readTexts(section: HTMLElement): PlanTexts | null {
  const script = section.querySelector('script[data-plans-text]')
  try {
    return script?.textContent ? (JSON.parse(script.textContent) as PlanTexts) : null
  } catch {
    return null
  }
}

/** ข้อความตามภาษาของหน้า ภาษาที่แอดมินเว้นว่างใช้ภาษาไทยแทน เหมือนในแอป */
function localized(text: LocalizedText | undefined, language: PlanTexts['language']): string {
  if (!text) return ''
  return text[language]?.trim() || text.th?.trim() || ''
}

/** ราคาเต็มดอลลาร์ไม่ต้องมี .00 ตรงกับ formatUsd ใน lib/money.ts */
function formatUsd(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price)
}

function featureRow(title: string, description = ''): HTMLLIElement | null {
  if (!title) return null
  const row = element('li', 'flex items-start gap-2')
  const icon = element('span', 'mt-0.5 shrink-0 text-success')
  icon.innerHTML = ICON_CHECK
  const body = element('span', 'min-w-0')
  body.append(element('span', 'block text-[13px] font-medium', title))
  if (description) {
    body.append(element('span', 'mt-0.5 block text-[12px] leading-relaxed text-muted-foreground', description))
  }
  row.append(icon, body)
  return row
}

function planCard(plan: Plan, t: PlanTexts): HTMLLIElement {
  const isFree = plan.userType === 'FREE'
  const card = element(
    'li',
    `relative flex min-w-0 flex-col rounded-xl border bg-card p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 ${
      plan.recommended ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-strong'
    }`,
  )

  const badges = element('div', 'flex min-h-5 flex-wrap items-center gap-1.5')
  if (plan.recommended) {
    const badge = element('span', 'inline-flex items-center gap-1 text-[11px] font-semibold text-primary')
    badge.innerHTML = ICON_STAR
    badge.append(t.recommended)
    badges.append(badge)
  }
  card.append(badges)

  card.append(element('h3', 'mt-1.5 text-[17px] font-semibold tracking-tight', plan.userType))

  const description = localized(plan.description, t.language)
  if (description) {
    card.append(element('p', 'mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-muted-foreground', description))
  }

  const price = element('p', 'mt-4 flex items-baseline gap-1')
  if (plan.monthlyPrice === null) {
    price.append(element('span', 'text-[20px] font-semibold tracking-tight', t.noPrice))
  } else if (plan.monthlyPrice === 0) {
    price.append(element('span', 'text-[28px] font-semibold tracking-tight', t.free))
  } else {
    price.append(
      element('span', 'text-[28px] font-semibold tracking-tight tabular-nums', formatUsd(plan.monthlyPrice, t.locale)),
      element('span', 'text-[12.5px] text-muted-foreground', t.perPeriod),
    )
  }
  card.append(price)

  /*
    ปุ่มพาไปต่อตามแพ็กเกจ ต่างจากในแอปที่ผู้ใช้ล็อกอินแล้ว
    FREE → สมัคร / ตั้งราคาแล้ว → หน้าชำระเงิน (ยังไม่ล็อกอินจะถูกพาไปล็อกอินก่อน) / ยังไม่ตั้งราคา → เข้าแอปไปติดต่อ
  */
  const button = element('a', `mt-4 ${isFree || plan.monthlyPrice === null ? secondaryButton : primaryButton}`)
  if (isFree) {
    button.href = t.signUpPath
    button.textContent = t.startFree
  } else if (plan.monthlyPrice === null || plan.monthlyPrice <= 0) {
    button.href = t.appPath
    button.textContent = t.contact
  } else {
    button.href = t.checkoutPath + plan.userType
    button.textContent = t.choose.replace(t.planToken, plan.userType)
  }
  card.append(button)

  const features = element('ul', 'mt-5 space-y-2.5 border-t border-border pt-4')
  // บรรทัดแรกสร้างจากตัวเลขเครดิตจริงเสมอ เหมือนในแอป
  const credits =
    plan.monthlyLimit === null
      ? t.creditsUnlimited
      : (isFree ? t.creditsFree : t.creditsPaid).replace(
          t.creditsToken,
          plan.monthlyLimit.toLocaleString(t.locale),
        )
  const rows = [
    featureRow(credits),
    ...(plan.features ?? []).map((feature) =>
      featureRow(localized(feature.title, t.language), localized(feature.description, t.language)),
    ),
  ]
  for (const row of rows) if (row) features.append(row)
  card.append(features)

  return card
}

async function fetchPlans(): Promise<Plan[] | null> {
  try {
    const response = await fetch(`${env.apiUrl}/public/plans`)
    if (!response.ok) return null
    const body = (await response.json()) as { data?: Plan[] }
    return Array.isArray(body.data) ? body.data : null
  } catch {
    return null
  }
}

export async function showPlans(): Promise<void> {
  const section = document.querySelector<HTMLElement>('[data-plans]')
  const list = section?.querySelector<HTMLUListElement>('[data-plans-list]')
  const error = section?.querySelector<HTMLElement>('[data-plans-error]')
  if (!section || !list) return

  const texts = readTexts(section)
  const plans = texts ? await fetchPlans() : null

  // อ่านไม่ได้หรือไม่มีแพ็กเกจเลย เอากล่องว่างออกแล้วแสดงข้อความแทน ไม่ปล่อยให้กระพริบค้างไว้
  if (!texts || !plans || plans.length === 0) {
    list.remove()
    if (error) error.hidden = false
    return
  }

  list.replaceChildren(...plans.map((plan) => planCard(plan, texts)))
  list.removeAttribute('aria-busy')
  // แพ็กเกจน้อยกว่าสี่ใบ ไม่ต้องเว้นคอลัมน์ว่างไว้ทางขวา
  if (plans.length < 4) list.classList.replace('xl:grid-cols-4', 'lg:grid-cols-3')
}
