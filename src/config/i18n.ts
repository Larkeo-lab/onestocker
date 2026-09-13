import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
  APP_LANGUAGE_CODES,
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  isAppLanguage,
  readStoredLanguage,
  storeLanguage,
  type AppLanguage,
} from './languages'
import enTranslations from './messages/en.json'
import loTranslations from './messages/lo.json'
import thTranslations from './messages/th.json'

/*
  ภาษาอังกฤษเป็นต้นแบบ — ใส่ key ใหม่ที่ en.json ก่อน แล้วค่อยเติมภาษาอื่น
  satisfies ทำให้ tsc ฟ้องทันทีถ้า th.json หรือ lo.json ขาด key ไหนไป
  แทนที่จะไปโผล่เป็นข้อความอังกฤษปนบนหน้าจอโดยไม่มีใครสังเกต
*/
const resources = {
  en: { translation: enTranslations },
  th: { translation: thTranslations satisfies typeof enTranslations },
  lo: { translation: loTranslations satisfies typeof enTranslations },
}

declare module 'i18next' {
  interface CustomTypeOptions {
    // ให้ t('...') ตรวจชื่อ key ตอน compile พิมพ์ผิดแล้ว build ไม่ผ่าน
    defaultNS: 'translation'
    resources: { translation: typeof enTranslations }
  }
}

/*
  ใช้ instance เดียวทั้งตัวแอปและหน้า landing ที่ render ตอน build

  ไม่ใช้ i18next-browser-languagedetector เพราะไม่ได้ต้องการเดาจากภาษาเบราว์เซอร์
  (ภาษาตั้งต้นคืออังกฤษ) และตัวนั้นแตะ window ซึ่งไม่มีตอน render หน้า landing บน Node

  initAsync: false เพราะคำแปลอยู่ในไฟล์ครบแล้ว ไม่ต้องรอโหลด
  ตอน render หน้า landing จะได้ข้อความทันทีไม่ใช่ key เปล่า ๆ
*/
void i18n.use(initReactI18next).init({
  resources,
  defaultNS: 'translation',
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: APP_LANGUAGE_CODES,
  interpolation: {
    // React escape ให้อยู่แล้ว
    escapeValue: false,
  },
  initAsync: false,
})

function syncDocument(language: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
}

syncDocument(i18n.language)

i18n.on('languageChanged', (language) => {
  if (!isAppLanguage(language)) return
  storeLanguage(language)
  syncDocument(language)
})

/** ภาษาที่ใช้แสดงผลอยู่ตอนนี้ ตัดกรณีแปลก ๆ ทิ้งให้เหลือแค่ภาษาที่รองรับ */
export function currentLanguage(): AppLanguage {
  const language = i18n.resolvedLanguage
  return isAppLanguage(language) ? language : DEFAULT_LANGUAGE
}

/** locale สำหรับ Intl ตามภาษาที่เลือก เช่นวันที่ของไทยจะเป็น พ.ศ. */
export function intlLocale(): string {
  return APP_LANGUAGES[currentLanguage()].intlLocale
}

export default i18n
