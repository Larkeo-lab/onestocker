import { useSyncExternalStore } from 'react'

/**
 * ธีมสว่าง / มืด ที่ผู้ใช้เลือก จำไว้ในเครื่อง (ไม่ผูกกับบัญชี คนละเครื่องเลือกต่างกันได้)
 *
 * ธีมจริงอยู่ที่ <html data-theme="light|dark"> สีทั้งแอปเปลี่ยนตาม token ใน index.css
 * script ใน <head> ของ index.html ตั้งค่านี้ก่อนวาดหน้าแล้ว หน้าจึงไม่กะพริบขาวตอนเปิด
 * THEME_STORAGE_KEY ต้องตรงกับ script นั้น
 */
export const THEME_STORAGE_KEY = 'theme'

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type Theme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()

/** ค่าที่เพิ่งเลือกในแท็บนี้ เผื่อ localStorage พังแล้วอ่านกลับไม่ได้ */
let chosen: ThemePreference | null = null

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage ใช้ไม่ได้ (โหมดส่วนตัวบางเบราว์เซอร์) ก็ตามระบบไป
  }
  return 'system'
}

function resolve(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

const getPreference = () => chosen ?? readPreference()

function apply() {
  document.documentElement.dataset.theme = resolve(getPreference())
  listeners.forEach((listener) => listener())
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // จำไม่ได้ก็ยังเปลี่ยนธีมในหน้านี้ได้
  }
  chosen = preference
  apply()
}

if (typeof window !== 'undefined') {
  // ตั้ง "ตามระบบ" ไว้ แล้วผู้ใช้สลับโหมดของเครื่อง ให้แอปเปลี่ยนตามทันที
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (getPreference() === 'system') apply()
  })
  // เปลี่ยนธีมในอีกแท็บ แท็บนี้เปลี่ยนตาม
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
    chosen = null
    apply()
  })
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

/** preference คือที่ผู้ใช้เลือก (รวม "ตามระบบ") theme คือที่แสดงอยู่จริง */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => 'system' as const)
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as const)
  return { preference, theme, setPreference: setThemePreference }
}
