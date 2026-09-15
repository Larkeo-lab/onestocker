import {
  ArrowRight,
  CircleCheck,
  FileSpreadsheet,
  Languages,
  ListOrdered,
  ShieldCheck,
  Sparkles,
  Tags,
  Type,
  Upload,
  History,
  ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import i18n from '@/config/i18n'
import { APP_LANGUAGE_CODES, APP_LANGUAGES, type AppLanguage } from '@/config/languages'
import { PLATFORMS } from '@/config/platforms'
import { APP_PATH, siteConfig } from '@/config/site'

/*
  หน้านี้ถูก render เป็น HTML ตอน build แล้วไม่มี JavaScript มาจับต่อ
  (ดู scripts/prerender.mjs) จึงมีกติกาสองข้อ

  1. ห้ามใช้ hook ของ react-router หรือ Clerk — ตอน build ไม่มี provider
     พวกนั้นอยู่ ลิงก์ทุกอันจึงเป็น <a href> ธรรมดา ซึ่งเป็นการโหลดหน้าใหม่ทั้งหน้า
     ตรงตามที่ต้องการอยู่แล้ว เพราะตัวแอปโหลดแยกอีกชุด
  2. ห้ามพึ่ง onClick หรือ state — ไม่มีใครมาผูก event ให้ ปุ่มจะกดไม่ติด
     ส่วนที่ต้องเปิด-ปิดอย่างคำถามที่พบบ่อย ใช้ <details> ของ HTML แทน
     ช่องเลือกภาษาทำงานผ่าน inline script ใน index.html

  ข้อความทั้งหมดมาจาก config/messages/<ภาษา>.json ใต้ key "landing"
  แต่ละภาษาถูก render เป็นคนละไฟล์ จึงรับภาษามาเป็น prop แทนการอ่านภาษาที่ผู้ใช้เลือกไว้
*/

const SIGN_UP_PATH = "/sign-up";
const SIGN_IN_PATH = "/sign-in";

/** ตัวคั่นตำแหน่งตัวเลขในข้อความปุ่มสมัคร ไม่มีทางซ้ำกับคำในไฟล์ภาษา */
const CREDITS_TOKEN = "@@credits@@";

/** ตัวคั่นชื่อแพ็กเกจในข้อความปุ่ม "เลือก PRO" landing/plans.ts แทนด้วยชื่อจริง */
const PLAN_TOKEN = "@@plan@@";

/**
 * JSON ที่ฝังใน <script> ต้องไม่มี "</script>" โผล่ในเนื้อหา
 * แทน < ด้วยรหัส unicode ซึ่ง JSON อ่านได้เหมือนเดิม
 */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

const FEATURE_ICONS: LucideIcon[] = [
  Type,
  ListOrdered,
  Tags,
  ShieldCheck,
  Languages,
  History,
];
const STEP_ICONS: LucideIcon[] = [Upload, Sparkles, FileSpreadsheet];

/**
 * ตัวอย่างผลลัพธ์ในส่วนหัว — เป็นข้อความจริงให้ Google อ่านได้ ไม่ใช่รูปภาพ
 * เป็นภาษาอังกฤษทุกภาษา เพราะ metadata ที่แอปสร้างจริงเป็นภาษาอังกฤษ
 */
const SAMPLE = {
  filename: "sunset-beach-0142.jpg",
  title:
    "Golden sunset over a calm tropical beach with palm trees and gentle waves",
  keywords: [
    "sunset",
    "beach",
    "tropical",
    "palm tree",
    "ocean",
    "golden hour",
    "travel",
    "vacation",
    "horizon",
    "paradise",
  ],
  moreKeywords: 30,
  category: "Landscapes",
};

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-xs hover:shadow-md";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-all duration-200 ease-out hover:border-border-strong hover:bg-muted hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

const container = "mx-auto w-full max-w-6xl px-5 sm:px-6";

export function LandingPage({ language }: { language: AppLanguage }) {
  const t = i18n.getFixedT(language);

  // แพลตฟอร์ม "General" เป็นตัวเลือกภายในแอป ไม่ใช่ตลาดที่ขายรูปได้จริง
  const marketplaces = PLATFORMS.filter(
    (platform) => platform.id !== "general",
  );

  // แบ่งข้อความปุ่มสมัครออกเป็นก่อนและหลังตัวเลข ตัวเลขจริงถูกเติมตอนเปิดหน้า
  // ลำดับคำต่างกันในแต่ละภาษา จึงใช้ตัวคั่นแทนการต่อคำเอง
  const [signUpCreditsBefore, signUpCreditsAfter = ""] = t(
    "landing.signUpCredits",
    { credits: CREDITS_TOKEN },
  ).split(CREDITS_TOKEN);

  const steps = t("landing.howItWorks.steps", { returnObjects: true as const });
  const features = t("landing.features.items", { returnObjects: true as const });
  const faqs = t("landing.faq.items", { returnObjects: true as const });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md transition-shadow duration-300">
        <div
          className={`${container} flex h-14 items-center justify-between gap-4`}
        >
          {/* ใช้ชื่อเป็นตัวหนังสือ ไม่ใช้ logo/mark.png เพราะไฟล์นั้นเป็นคำว่า Onestocks
              อยู่แล้ว ย่อเหลือ 28px จะอ่านไม่ออกและซ้ำกับชื่อข้าง ๆ */}
          <a
            href={APP_LANGUAGES[language].landingPath}
            className="group flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-primary transition-transform duration-300 group-hover:scale-125"
            />
            <span className="text-[15px] font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </a>

          {/* ซ่อนบนจอเล็ก เพราะไม่มี JavaScript ทำเมนูพับได้ ปุ่มหลักยังอยู่ครบ */}
          <nav
            aria-label={t("landing.nav.label")}
            className="hidden items-center gap-6 text-[13px] text-muted-foreground md:flex"
          >
            <a
              href="#how-it-works"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {t("landing.nav.howItWorks")}
            </a>
            <a
              href="#features"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {t("landing.nav.features")}
            </a>
            <a
              href="#platforms"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {t("landing.nav.platforms")}
            </a>
            <a
              href="#pricing"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {t("landing.nav.pricing")}
            </a>
            <a
              href="#faq"
              className="transition-colors duration-200 hover:text-foreground"
            >
              {t("landing.nav.faq")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <img
                src={APP_LANGUAGES[language].flag}
                alt=""
                aria-hidden
                className="pointer-events-none absolute left-2.5 size-4 rounded-xs object-cover"
              />
              {/* value คือ path ของหน้าภาษานั้น inline script ใน index.html พาไปให้ */}
              <select
                name="language"
                id="language-select"
                aria-label={t("common.selectLanguage")}
                defaultValue={APP_LANGUAGES[language].landingPath}
                className="h-9 cursor-pointer appearance-none rounded-md border border-border bg-card pl-8 pr-7 text-[12.5px] font-medium text-foreground transition-all duration-200 hover:border-border-strong hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {APP_LANGUAGE_CODES.map((code) => (
                  <option
                    key={code}
                    value={APP_LANGUAGES[code].landingPath}
                    data-language={code}
                    lang={code}
                    className="bg-card text-foreground"
                  >
                    {APP_LANGUAGES[code].label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground"
                aria-hidden
              />
            </div>
            <a
              href={SIGN_IN_PATH}
              className="hidden h-9 items-center px-3 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground sm:inline-flex"
            >
              {t("landing.signIn")}
            </a>
            <a
              href={SIGN_UP_PATH}
              className={`${primaryButton} h-9 px-3.5 text-[13px]`}
            >
              {/* จอแคบใช้คำสั้นเสมอ ข้อความยาวจะดันโลโก้กับตัวเลือกภาษาจนล้นจอ */}
              <span className="sm:hidden">{t("landing.signUp")}</span>
              {/*
                จำนวนเครดิตมาจากหน้า admin เติมตอนเปิดหน้าโดย landing/freeCredits.ts
                ยังไม่รู้ตัวเลข (หรืออ่านไม่ได้) แสดงคำสำรองไว้ก่อน ไม่เขียนตัวเลขลง HTML
                เพราะหน้านี้ build ไว้ล่วงหน้า ตัวเลขจะเก่าทันทีที่แอดมินแก้
              */}
              <span className="hidden sm:inline" data-free-credits-fallback>
                {t("landing.signUp")}
              </span>
              <span className="hidden sm:inline" data-free-credits-label hidden>
                {signUpCreditsBefore}
                <span data-free-credits-count />
                {signUpCreditsAfter}
              </span>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div
            className={`${container} grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]`}
          >
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[12px] text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-muted/50">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {t("landing.hero.badge")}
              </p>

              <h1 className="mt-5 text-[34px] leading-[1.15] font-semibold tracking-tight sm:text-[44px]">
                {t("landing.hero.titleLine1")}
                <br />
                {t("landing.hero.titleLine2")}
              </h1>

              <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted-foreground">
                {t("landing.hero.body")}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={SIGN_UP_PATH} className={primaryButton}>
                  {t("landing.signUp")}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </a>
                <a href="#how-it-works" className={secondaryButton}>
                  {t("landing.hero.secondaryCta")}
                </a>
              </div>

              <p className="mt-4 text-[12.5px] text-subtle-foreground">
                {t("landing.hero.note")}
              </p>
            </div>

            {/* ตัวอย่างผลลัพธ์ — หน้าตาเดียวกับการ์ดในแอป */}
            <figure className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5 transition-all duration-300 hover:shadow-lg hover:border-border-strong hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="size-14 shrink-0 rounded-lg bg-linear-to-br from-amber-300 via-orange-400 to-sky-500 transition-transform duration-300 hover:scale-105"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12px] text-muted-foreground">
                    {SAMPLE.filename}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                    <CircleCheck className="size-3" aria-hidden />
                    Generated
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-4 text-[13px]">
                <div>
                  <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Title
                  </dt>
                  <dd className="mt-1.5 rounded-md border border-border bg-background px-3 py-2 leading-relaxed transition-colors duration-200 hover:border-border-strong">
                    {SAMPLE.title}
                  </dd>
                </div>

                <div>
                  <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Keywords
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {SAMPLE.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-[12px] transition-colors duration-200 hover:border-border-strong hover:bg-background"
                      >
                        {keyword}
                      </span>
                    ))}
                    <span className="rounded-full px-2 py-0.5 text-[12px] text-subtle-foreground">
                      {t("landing.sample.moreKeywords", {
                        count: SAMPLE.moreKeywords,
                      })}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Category
                  </dt>
                  <dd className="mt-1.5">{SAMPLE.category}</dd>
                </div>
              </dl>

              <figcaption className="sr-only">
                {t("landing.sample.caption", { siteName: siteConfig.name })}
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── วิธีใช้งาน ───────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="scroll-mt-14 border-b border-border"
        >
          <div className={`${container} py-16 md:py-20`}>
            <h2 className="text-[26px] font-semibold tracking-tight">
              {t("landing.howItWorks.title")}
            </h2>
            <p className="mt-2 text-[14.5px] text-muted-foreground">
              {t("landing.howItWorks.subtitle")}
            </p>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index];
                return (
                  <li
                    key={step.title}
                    className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="font-mono text-[12px] text-subtle-foreground">
                        {t("landing.howItWorks.step", { step: index + 1 })}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── ฟีเจอร์ ─────────────────────────────────────────── */}
        <section
          id="features"
          className="scroll-mt-14 border-b border-border bg-sidebar"
        >
          <div className={`${container} py-16 md:py-20`}>
            <h2 className="text-[26px] font-semibold tracking-tight">
              {t("landing.features.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] text-muted-foreground">
              {t("landing.features.subtitle")}
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index];
                return (
                  <li
                    key={feature.title}
                    className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-lg hover:shadow-primary/5"
                  >
                    <Icon
                      className="size-5 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:text-primary-hover"
                      aria-hidden
                    />
                    <h3 className="mt-3 text-[15px] font-semibold">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── แพลตฟอร์ม ───────────────────────────────────────── */}
        <section id="platforms" className="scroll-mt-14 border-b border-border">
          <div className={`${container} py-16 md:py-20`}>
            <h2 className="text-[26px] font-semibold tracking-tight">
              {t("landing.platforms.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] text-muted-foreground">
              {t("landing.platforms.subtitle")}
            </p>

            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {marketplaces.map((platform) => (
                <li
                  key={platform.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-xs hover:bg-muted/40"
                >
                  {platform.icon ? (
                    <img
                      src={platform.icon}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      className="size-6 shrink-0 rounded object-contain transition-transform duration-200 group-hover:scale-110"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white transition-transform duration-200 hover:scale-110"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.monogram}
                    </span>
                  )}
                  <span className="truncate text-[13px] font-medium">
                    {platform.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── ราคา ───────────────────────────────────────────────
            แพ็กเกจมาจากหน้า admin จึงเขียนลง HTML ตอน build ไม่ได้ (ราคาจะเก่าทันทีที่แอดมินแก้)
            หน้านี้วาดการ์ดว่างไว้ก่อน แล้ว landing/plans.ts ดึงแพ็กเกจจริงมาวางแทนตอนเปิดหน้า
            ข้อความของการ์ดฝังเป็น JSON ไว้ในหน้า จะได้ไม่ต้องโหลด i18next ทั้งก้อนมาด้วย */}
        <section
          id="pricing"
          data-plans
          className="scroll-mt-14 border-b border-border bg-sidebar"
        >
          <div className={`${container} py-16 md:py-20`}>
            <h2 className="text-[26px] font-semibold tracking-tight">
              {t("landing.pricing.title")}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] text-muted-foreground">
              {t("landing.pricing.subtitle")}
            </p>

            <ul
              data-plans-list
              aria-busy="true"
              className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {[0, 1, 2, 3].map((index) => (
                <li
                  key={index}
                  aria-hidden
                  className="h-96 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </ul>

            <p
              data-plans-error
              hidden
              className="mt-10 rounded-xl border border-dashed border-border-strong bg-card px-6 py-10 text-center text-[13.5px] text-muted-foreground"
            >
              {t("landing.pricing.error")}{" "}
              <a
                href={SIGN_UP_PATH}
                className="font-medium text-primary hover:underline"
              >
                {t("landing.signUp")}
              </a>
            </p>

            <p className="mt-6 text-[12.5px] text-subtle-foreground">
              {t("landing.pricing.note")}
            </p>

            <script
              type="application/json"
              data-plans-text
              dangerouslySetInnerHTML={{
                __html: jsonForScript({
                  language,
                  locale: APP_LANGUAGES[language].intlLocale,
                  signUpPath: SIGN_UP_PATH,
                  checkoutPath: `${APP_PATH}/checkout/`,
                  appPath: APP_PATH,
                  recommended: t("plans.recommended"),
                  free: t("plans.free"),
                  noPrice: t("plans.noPrice"),
                  perPeriod: t("plans.perPeriod"),
                  creditsFree: t("plans.creditsFree", { credits: CREDITS_TOKEN }),
                  creditsPaid: t("plans.creditsPaid", { credits: CREDITS_TOKEN }),
                  creditsUnlimited: t("plans.creditsUnlimited"),
                  startFree: t("landing.signUp"),
                  choose: t("plans.choose", { plan: PLAN_TOKEN }),
                  contact: t("landing.pricing.contact"),
                  creditsToken: CREDITS_TOKEN,
                  planToken: PLAN_TOKEN,
                }),
              }}
            />
          </div>
        </section>

        {/* ── คำถามที่พบบ่อย ───────────────────────────────────── */}
        <section id="faq" className="scroll-mt-14 border-b border-border">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-6 md:py-20">
            <h2 className="text-[26px] font-semibold tracking-tight">
              {t("landing.faq.title")}
            </h2>

            <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group px-5 py-4 transition-colors duration-200 hover:bg-muted/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-medium [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden
                      className="text-[18px] leading-none text-subtle-foreground transition-transform duration-300 ease-out group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── ปิดท้าย ─────────────────────────────────────────── */}
        <section>
          <div className={`${container} py-16 text-center md:py-24`}>
            <h2 className="text-[28px] font-semibold tracking-tight">
              {t("landing.closing.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14.5px] text-muted-foreground">
              {t("landing.closing.body", { siteName: siteConfig.name })}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={SIGN_UP_PATH} className={primaryButton}>
                {t("landing.signUp")}
                <ArrowRight className="size-4" aria-hidden />
              </a>
              <a href={APP_PATH} className={secondaryButton}>
                {t("landing.closing.secondaryCta")}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div
          className={`${container} flex flex-col items-center justify-between gap-3 py-6 text-[12.5px] text-subtle-foreground sm:flex-row`}
        >
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span>{t("landing.footer.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}
