import { useCallback, useEffect, useRef, useState } from 'react'

import i18n from '@/config/i18n'
import { ApiError } from '@/lib/api'

/** แปลง error อะไรก็ตามให้เป็นข้อความที่เอาไปแสดงได้ */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return i18n.t('common.unknownError')
}

export type AsyncState<T> = {
  data: T | undefined
  error: string | undefined
  loading: boolean
  /** โหลดใหม่ ใช้หลังบันทึกหรือกดปุ่มลองใหม่ */
  reload: () => void
}

/**
 * โหลดข้อมูลตอน mount และตอน deps เปลี่ยน
 *
 * เขียนเองเพราะแอปนี้ยังไม่ได้ใช้ react-query — งานที่ต้องทำมีแค่
 * "โหลดตอนเปิดหน้า" กับ "โหลดใหม่หลังบันทึก" ยังไม่คุ้มกับการเพิ่ม dependency
 *
 * @param run ฟังก์ชันที่ยิง API — ไม่ต้อง useCallback เพราะเก็บไว้ใน ref
 * @param deps บอกว่าเมื่อไรควรโหลดใหม่ ใช้แบบเดียวกับ useEffect
 */
export function useAsync<T>(run: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  // เก็บ run ตัวล่าสุดไว้ ผู้เรียกจะได้ส่ง arrow function มาตรง ๆ ได้
  // โดยไม่ทำให้ effect ทำงานซ้ำทุก render
  const runRef = useRef(run)
  // เขียนใน effect ไม่ใช่ระหว่าง render — effect ตัวนี้ประกาศก่อน
  // จึงทำงานก่อน effect ที่เรียก runRef.current() เสมอ
  useEffect(() => {
    runRef.current = run
  })

  useEffect(() => {
    // กันผลลัพธ์ของคำขอเก่ามาทับของใหม่ เวลาผู้ใช้กดเปลี่ยนหน้าเร็ว ๆ
    // และกัน setState หลัง unmount ตอน StrictMode เรียก effect สองรอบ
    let cancelled = false

    setLoading(true)
    setError(undefined)

    runRef.current().then(
      (result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      },
      (cause: unknown) => {
        if (cancelled) return
        setError(errorMessage(cause))
        setLoading(false)
      },
    )

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { data, error, loading, reload }
}
