import { adobeCategoryNumber } from '@/config/adobe'
import { PLATFORMS, type Platform } from '@/config/platforms'
import type { Asset } from '@/types/asset'

import { downloadCsv, toCsv } from './csv'

/**
 * ตัดข้อความให้พอดีเพดานของแต่ละแพลตฟอร์ม โดยตัดที่ขอบเขตคำ
 *
 * นับเป็นตัวอักษร ไม่ใช่ไบต์ เพราะภาษาไทยและลาวตัวหนึ่งกินหลายไบต์
 */
function fit(value: string, max: number | null): string {
  if (max === null) return value

  const runes = [...value]
  if (runes.length <= max) return value

  const cut = runes.slice(0, max).join('')
  const space = cut.lastIndexOf(' ')
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim()
}

/** ตัดจำนวนคีย์เวิร์ดให้พอดีเพดาน คำแรก ๆ สำคัญที่สุดจึงตัดจากท้าย */
function keywordsFor(asset: Asset, platform: Platform): string {
  return asset.keywords.slice(0, platform.limits.keywords).join(', ')
}

export type ExportFormat = {
  /** ต้องตรงกับ id ใน config/platforms.ts */
  id: string
  label: string
  headers: string[]
  row: (asset: Asset, platform: Platform) => string[]
  /**
   * true = รูปแบบคอลัมน์ยืนยันกับเทมเพลตทางการแล้ว
   * false = เดาจากรูปแบบทั่วไป ต้องเทียบกับเอกสารของเจ้านั้นก่อนใช้จริง
   */
  verified: boolean
}

/**
 * รูปแบบไฟล์ของแต่ละแพลตฟอร์ม
 *
 * เพิ่มเจ้าใหม่ได้โดยเติมรายการที่นี่ที่เดียว ไม่ต้องแก้ที่อื่น
 * แต่ต้องเทียบคอลัมน์กับเทมเพลตทางการของเจ้านั้นก่อน แล้วค่อยตั้ง verified
 */
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'adobe-stock',
    label: 'Adobe Stock',
    verified: true,
    // Adobe ไม่มีช่อง description และใช้เลขหมวด 1-21 ไม่ใช่ชื่อ
    // Releases เว้นว่างไว้ ใส่เมื่อมีเอกสารยินยอมจากนายแบบหรือเจ้าของสถานที่
    headers: ['Filename', 'Title', 'Keywords', 'Category', 'Releases'],
    row: (asset, platform) => [
      asset.filename,
      fit(asset.title, platform.limits.title),
      keywordsFor(asset, platform),
      adobeCategoryNumber(asset.category),
      '',
    ],
  },
  {
    id: 'general',
    label: 'ทั่วไป (ทุกช่อง)',
    verified: true,
    // ไม่ได้เจาะจงเจ้าไหน ใส่ครบทุกช่องไว้ให้เอาไปปรับเอง
    headers: ['Filename', 'Title', 'Keywords', 'Category'],
    row: (asset, platform) => [
      asset.filename,
      fit(asset.title, platform.limits.title),
      keywordsFor(asset, platform),
      asset.category,
    ],
  },
]

export function findFormat(id: string): ExportFormat {
  return EXPORT_FORMATS.find((format) => format.id === id) ?? EXPORT_FORMATS[0]
}

function findPlatform(id: string): Platform {
  return (
    PLATFORMS.find((platform) => platform.id === id) ??
    PLATFORMS.find((platform) => platform.id === 'general') ??
    PLATFORMS[0]
  )
}

/** 2026-09-11 */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * exportAssets สร้างไฟล์ CSV แล้วสั่งดาวน์โหลด คืนจำนวนแถวที่เขียนจริง
 *
 * เอาเฉพาะรูปที่สร้าง metadata แล้ว — รูปที่ยังไม่ได้เจนจะได้แถวว่าง
 * ซึ่งทำให้แพลตฟอร์มปฏิเสธทั้งไฟล์
 */
export function exportAssets(assets: Asset[], formatId: string): number {
  const format = findFormat(formatId)
  const platform = findPlatform(formatId)

  const ready = assets.filter(
    (asset) => asset.status === 'generated' && asset.title.trim() !== '',
  )
  if (ready.length === 0) return 0

  const csv = toCsv(
    format.headers,
    ready.map((asset) => format.row(asset, platform)),
  )
  downloadCsv(`${formatId}-${today()}.csv`, csv)

  return ready.length
}
