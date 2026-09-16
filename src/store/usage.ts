import { create } from 'zustand'

import { fetchUsage } from '@/lib/api/usage'
import type { Usage } from '@/types/usage'

/**
 * หน่วงก่อนถามยอดจริงจากเซิร์ฟเวอร์ หน่วยเป็นมิลลิวินาที
 *
 * การสร้างทีละหลายรูปจะเรียก markUsed หลายครั้งติดกัน ถ้าถามทุกครั้ง
 * จะได้คำขอเท่าจำนวนรูปโดยที่คำตอบก่อนหน้ายังไม่ทันมีความหมาย
 * รอให้เงียบก่อนแล้วค่อยถามครั้งเดียว
 */
const RECONCILE_DELAY = 1500

let reconcileTimer: ReturnType<typeof setTimeout> | null = null

type UsageState = {
  usage: Usage | null
  loading: boolean
  /** true เมื่ออ่านยอดไม่สำเร็จ — sidebar จะแสดงขีดแทนตัวเลขที่อาจผิด */
  failed: boolean
  /** true เมื่อการสร้างถูกปฏิเสธเพราะโควตาหมด — ป๊อปอัปติดต่อจะถูกเปิด */
  limitReached: boolean
  /** true เมื่อเปิดป๊อปอัปเลือกแพ็กเกจ (ปุ่ม Upgrade บน header หรือปุ่มดูแพ็กเกจในป๊อปอัปเครดิตหมด) */
  plansOpen: boolean

  refresh: () => Promise<void>
  /** เรียกทุกครั้งที่งานที่ใช้เครดิตสำเร็จหนึ่งครั้ง ส่งจำนวนเครดิตของงานนั้นมา */
  markUsed: (credits: number) => void
  /** เรียกเมื่อเซิร์ฟเวอร์ตอบ 402 เพราะโควตาหมด */
  reportLimitReached: () => void
  openPlans: () => void
  closePlans: () => void
  dismissLimitReached: () => void
}

export const useUsageStore = create<UsageState>((set, get) => ({
  usage: null,
  loading: false,
  failed: false,
  limitReached: false,
  plansOpen: false,

  refresh: async () => {
    set({ loading: true })
    try {
      set({ usage: await fetchUsage(), loading: false, failed: false })
    } catch {
      /*
        ไม่ล้างยอดเดิมทิ้งตอนอ่านไม่สำเร็จ

        ตัวเลขเก่าที่อาจคลาดไปหนึ่งยังมีประโยชน์กว่าขีดว่าง ๆ
        และเน็ตสะดุดชั่วครู่ไม่ควรทำให้ตัวเลขบน sidebar กระพริบหาย
      */
      set({ loading: false, failed: true })
    }
  },

  markUsed: (credits) => {
    /*
      บวกให้เห็นทันทีโดยไม่รอเซิร์ฟเวอร์

      การสร้างหนึ่งรูปใช้เวลาหลายวินาที ถ้ารอถามยอดจริงก่อนค่อยขยับเลข
      ผู้ใช้จะเห็นตัวเลขค้างอยู่นานจนนึกว่าไม่ได้นับ

      ค่านี้เป็นแค่ค่าประมาณระหว่างรอ — ตัวจริงมาจาก refresh ด้านล่าง
      ซึ่งจะทับค่านี้เสมอ
    */
    const current = get().usage
    if (current) {
      set({
        usage: {
          ...current,
          used: current.used + credits,
          remaining:
            current.remaining === null ? null : Math.max(current.remaining - credits, 0),
        },
      })
    }

    if (reconcileTimer) clearTimeout(reconcileTimer)
    reconcileTimer = setTimeout(() => {
      reconcileTimer = null
      void get().refresh()
    }, RECONCILE_DELAY)
  },

  /*
    กันเปิดซ้ำ

    การกด Generate หนึ่งครั้งยิงหลายรูปพร้อมกัน ทุกรูปจะได้ 402 เหมือนกันหมด
    ถ้าไม่กันไว้จะยิงถามยอดใหม่เท่าจำนวนรูปที่ค้างอยู่
  */
  reportLimitReached: () => {
    if (get().limitReached) return
    set({ limitReached: true })
    // ดึงยอดจริงมาแสดงในป๊อปอัป เผื่อแอดมินเพิ่งลดเพดานลงระหว่างทาง
    void get().refresh()
  },

  /*
    ปิดป๊อปอัปเครดิตหมดไปพร้อมกัน ถ้าเปิดมาจากปุ่มในป๊อปอัปนั้น
    ไม่งั้นปิดหน้าแพ็กเกจแล้วจะเจอป๊อปอัปเครดิตหมดค้างอยู่ข้างหลัง
  */
  openPlans: () => {
    set({ plansOpen: true, limitReached: false })
    // ป้ายแพ็กเกจปัจจุบันต้องเป็นของล่าสุด เผื่อแอดมินเพิ่งเติมให้
    void get().refresh()
  },

  closePlans: () => set({ plansOpen: false }),

  dismissLimitReached: () => set({ limitReached: false }),
}))
