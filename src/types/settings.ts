/** สไตล์ของ title ที่ให้ผู้ใช้เลือกได้ */
export const TITLE_STYLES = ['descriptive', 'concise', 'commercial'] as const
export type TitleStyle = (typeof TITLE_STYLES)[number]

export const KEYWORD_COUNTS = [20, 30, 40, 50] as const

/**
 * ภาษาของผลลัพธ์
 *
 * อังกฤษเป็นภาษาหลักเสมอ เพราะ Adobe Stock ใช้ค้นหาด้วยภาษาอังกฤษ
 * ภาษาอื่นเป็นของแถมไว้ใช้เอง หรือส่งไปแพลตฟอร์มในประเทศ
 */
export const PRIMARY_LANGUAGE = 'en'

/**
 * รหัสภาษาที่รู้จัก ชื่อที่แสดงบนหน้าจอแปลตามภาษาของหน้าเว็บ (hooks/useLanguageName.ts)
 * รายการที่เลือกได้จริงมาจาก GET /meta เซิร์ฟเวอร์เป็นเจ้าของ
 */
export const OUTPUT_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'lo', name: 'Lao', native: 'ລາວ' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
] as const

export type LanguageCode = (typeof OUTPUT_LANGUAGES)[number]['code']

export type UserSettings = {
  keywordsPerImage: number
  titleStyle: TitleStyle
  /** คำต้องห้ามเพิ่มเติมของผู้ใช้ คั่นด้วยจุลภาค */
  blockedTerms: string
  /** ภาษาของผลลัพธ์ คั่นด้วยจุลภาค เช่น "en,lo" — มี en เสมอ */
  outputLanguages: string
  /** แพลตฟอร์มที่เลือกสำหรับ export คั่นด้วยจุลภาค เช่น "adobe-stock,shutterstock" */
  selectedPlatforms: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  // 40 คำเป็นช่วงที่ Adobe Stock ค้นเจอดีที่สุดโดยยังไม่ต้องยัดคำที่ไม่ตรง
  // (เพดานจริงของ Adobe คือ 50)
  keywordsPerImage: 40,
  titleStyle: 'descriptive',
  blockedTerms: '',
  outputLanguages: PRIMARY_LANGUAGE,
  selectedPlatforms: 'adobe-stock',
}

/** แปลงข้อความในช่องกรอกเป็นรายการคำ ตัดช่องว่างและคำซ้ำออก */
export function parseBlockedTerms(value: string): string[] {
  const seen = new Set<string>()
  for (const term of value.split(/[,\n]/)) {
    const trimmed = term.trim().toLowerCase()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen]
}

/**
 * อ่านรายการภาษาจากค่าที่เก็บไว้
 * อังกฤษถูกใส่ไว้ข้างหน้าเสมอ ต่อให้ค่าที่บันทึกมาจะเพี้ยนหรือว่างเปล่า
 */
export function parseLanguages(value: string): LanguageCode[] {
  const known = new Set<string>(OUTPUT_LANGUAGES.map((item) => item.code))
  const picked = new Set<LanguageCode>([PRIMARY_LANGUAGE])

  for (const code of value.split(',')) {
    const trimmed = code.trim().toLowerCase()
    if (known.has(trimmed)) picked.add(trimmed as LanguageCode)
  }
  return [...picked]
}

/** ภาษารองที่ต้องแปลเพิ่ม (ตัดภาษาหลักออก) */
export function extraLanguages(value: string): LanguageCode[] {
  return parseLanguages(value).filter((code) => code !== PRIMARY_LANGUAGE)
}
