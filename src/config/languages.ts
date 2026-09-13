/**
 * ภาษาของหน้าเว็บ (ไม่ใช่ภาษาของ metadata ที่สร้าง — อันนั้นอยู่ใน types/settings.ts)
 *
 * ไฟล์นี้ต้องไม่ import i18next เพราะ main.tsx ใช้เช็คว่า path ไหนเป็นหน้า landing
 * ถ้าดึง i18next มาด้วย คนที่เปิดแค่หน้าแรกจะต้องโหลดคำแปลทั้งแอปไปฟรี ๆ
 *
 * ข้อความของแต่ละภาษาอยู่ใน config/messages/<code>.json
 */
export const APP_LANGUAGE_CODES = ['en', 'th', 'lo'] as const

export type AppLanguage = (typeof APP_LANGUAGE_CODES)[number]

export const DEFAULT_LANGUAGE: AppLanguage = 'en'

/**
 * key ใน localStorage ที่จำภาษาที่ผู้ใช้เลือกไว้
 * inline script ใน index.html อ่าน key เดียวกันนี้ ถ้าเปลี่ยนต้องแก้ที่นั่นด้วย
 */
export const LANGUAGE_STORAGE_KEY = 'i18nextLng'

export const APP_LANGUAGES: Record<
  AppLanguage,
  {
    /** ชื่อภาษาในภาษานั้นเอง คนที่อ่านภาษาปัจจุบันไม่ออกจะได้หาภาษาตัวเองเจอ */
    label: string
    flag: string
    /**
     * path ของหน้า landing ภาษานี้ ภาษาตั้งต้นอยู่ที่ / และถูกเขียนลง index.html
     * ภาษาอื่นถูกเขียนเป็น <path>.html ซึ่ง Cloudflare เสิร์ฟที่ /<path> ให้เอง
     * (ดู scripts/prerender.mjs) — เปลี่ยนเมื่อไรต้องแก้ inline script ใน index.html ด้วย
     */
    landingPath: string
    ogLocale: string
    /** locale ที่ส่งให้ Intl ตอนจัดรูปแบบวันที่และตัวเลข */
    intlLocale: string
  }
> = {
  en: {
    label: 'English',
    flag: '/flag/englan.webp',
    landingPath: '/',
    ogLocale: 'en_US',
    intlLocale: 'en-GB',
  },
  th: {
    label: 'ไทย',
    flag: '/flag/thai.png',
    landingPath: '/th',
    ogLocale: 'th_TH',
    intlLocale: 'th-TH',
  },
  lo: {
    label: 'ລາວ',
    flag: '/flag/lao.png',
    landingPath: '/lo',
    ogLocale: 'lo_LA',
    intlLocale: 'lo-LA',
  },
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGE_CODES.includes(value as AppLanguage)
}

/** คืนภาษาของหน้า landing ที่ path นี้ หรือ null ถ้าเป็นหน้าของตัวแอป */
export function landingLanguageFromPath(pathname: string): AppLanguage | null {
  // /th/ กับ /th เป็นหน้าเดียวกัน แต่ / ต้องคงไว้
  const path = pathname.replace(/(.)\/+$/, '$1')
  return APP_LANGUAGE_CODES.find((code) => APP_LANGUAGES[code].landingPath === path) ?? null
}

/**
 * ภาษาที่ผู้ใช้เลือกไว้ครั้งก่อน ไม่เคยเลือกก็ได้ภาษาตั้งต้น
 *
 * ไม่เดาจากภาษาของเบราว์เซอร์ — ภาษาตั้งต้นของเว็บคืออังกฤษ
 * localStorage อ่านไม่ได้ในบางโหมด (private, ปิด cookie) จึงห่อ try ไว้
 */
export function readStoredLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isAppLanguage(saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function storeLanguage(language: AppLanguage): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // จำไม่ได้ก็แค่กลับไปภาษาตั้งต้นตอนเปิดครั้งหน้า
  }
}
