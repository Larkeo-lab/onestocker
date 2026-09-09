import { createContext, use } from 'react'

import type { Asset } from '@/types/asset'

/**
 * รูปที่อัปขึ้นแล้วและยังไม่มีผลลัพธ์ — เป็นเป้าหมายของปุ่ม Generate
 * รวมรูปที่สร้าง metadata พลาดไว้ด้วย กดซ้ำแล้วลองใหม่ให้เอง
 */
export function isPending(asset: Asset): boolean {
  return (
    Boolean(asset.previewKey) &&
    asset.status !== 'generating' &&
    asset.status !== 'generated'
  )
}

export type GenerateContextValue = {
  assets: Asset[]
  /** ข้อความบอกว่าไฟล์ไหนไม่ได้เข้ารอบนี้ และเพราะอะไร */
  notice: string | null
  /** เพดานจำนวนรูปต่อรอบ อ่านมาจาก GET /meta */
  maxAssets: number
  addFiles: (files: File[]) => Promise<void>
  /** สร้าง metadata ให้ทุกรูปที่ยังไม่มีผลลัพธ์ */
  generate: () => Promise<void>
  /** สร้างใหม่เฉพาะรูปเดียว ใช้กับปุ่มในการ์ดผลลัพธ์ */
  regenerate: (id: string) => Promise<void>
  remove: (id: string) => void
  clear: () => void
}

export const GenerateContext = createContext<GenerateContextValue | null>(null)

export function useGenerate(): GenerateContextValue {
  const value = use(GenerateContext)
  if (!value) {
    throw new Error('useGenerate ต้องอยู่ภายใน GenerateProvider')
  }
  return value
}
