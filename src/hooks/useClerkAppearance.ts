import { useTheme } from '@/hooks/useTheme'

/**
 * ธีมของกล่อง Clerk
 *
 * ต้องกำหนดเป็นค่าสีจริงผ่าน `variables` เพราะ CSS ภายในของ Clerk
 * มี specificity สูงกว่าคลาส utility ของ Tailwind
 * ค่าเหล่านี้จึงต้องตรงกับ token ใน index.css ด้วยมือ
 */
const LIGHT = {
  colorPrimary: '#278bf5',
  colorBackground: '#ffffff',
  colorForeground: '#18181b',
  colorMutedForeground: '#71717a',
  colorInput: '#ffffff',
  colorInputForeground: '#18181b',
  colorNeutral: '#18181b',
  colorBorder: '#e4e4e7',
  colorDanger: '#dc2626',
  colorSuccess: '#16a34a',
  colorWarning: '#b45309',
  borderRadius: '0.5rem',
} as const

const DARK = {
  ...LIGHT,
  colorBackground: '#121215',
  colorForeground: '#fafafa',
  colorMutedForeground: '#a1a1aa',
  colorInput: '#0a0a0b',
  colorInputForeground: '#fafafa',
  colorNeutral: '#fafafa',
  colorBorder: '#26262b',
  colorDanger: '#ef4444',
  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
} as const

/** เปลี่ยนธีมตามที่ผู้ใช้เลือกในแอป (หรือตามระบบปฏิบัติการถ้าไม่ได้เลือก) */
export function useClerkAppearance() {
  const dark = useTheme().theme === 'dark'

  return {
    variables: dark ? DARK : LIGHT,
    elements: {
      rootBox: 'w-full max-w-[400px]',
      cardBox: 'shadow-none',
      formButtonPrimary: 'normal-case',
    },
  }
}
