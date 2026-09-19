import { useEffect } from 'react'

import { enqueuePreload, type PreloadItem } from '@/lib/preload'

/**
 * โหลดรูปเต็มของ items ล่วงหน้าตามลำดับที่ส่งมา (ลำดับบนหน้า) ดู lib/preload
 * รูปที่หายจากหน้า (ลบ ออกจากหน้าไป) หลุดจากคิวเองตอน items เปลี่ยน
 */
export function usePreloadImages(items: PreloadItem[]) {
  // เทียบด้วยข้อความ รายการใหม่ที่หน้าตาเหมือนเดิมทุก render ไม่ต้องจัดคิวใหม่
  const signature = JSON.stringify(items.map((item) => [item.key, item.url]))

  useEffect(() => {
    const pairs = JSON.parse(signature) as [string, string][]
    return enqueuePreload(pairs.map(([key, url]) => ({ key, url })))
  }, [signature])
}
