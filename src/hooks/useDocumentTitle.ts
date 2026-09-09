import { useEffect } from 'react'

import { siteConfig } from '@/config/site'

/**
 * ตั้งชื่อแท็บของแต่ละหน้า
 * แทน `export const metadata` ของ Next ที่ใช้ใน my-app
 */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${siteConfig.name}` : siteConfig.name
  }, [title])
}
