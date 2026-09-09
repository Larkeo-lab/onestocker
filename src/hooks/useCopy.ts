import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * จำสถานะ "คัดลอกแล้ว" ไว้ครู่หนึ่ง เพื่อให้ปุ่มยืนยันกลับไปหาผู้ใช้
 * ไม่งั้นกดแล้วหน้าจอเงียบ ผู้ใช้จะไม่รู้ว่าติดคลิปบอร์ดหรือยัง
 */
export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback((text: string) => {
    const value = text.trim()
    if (!value) return

    // ไม่มี navigator.clipboard เลยเมื่อเปิดผ่าน http ที่ไม่ใช่ localhost
    // เช่นตอนเปิดทดสอบจากมือถือด้วย IP ในวง LAN
    const clipboard = navigator.clipboard
    if (!clipboard) return

    clipboard.writeText(value).then(
      () => {
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 1500)
      },
      () => {
        // ผู้ใช้ปฏิเสธสิทธิ์คลิปบอร์ด ปล่อยปุ่มคงสภาพเดิม
        // ดีกว่าขึ้นว่าคัดลอกแล้วทั้งที่ไม่ได้คัดลอก
      },
    )
  }, [])

  return [copied, copy]
}
