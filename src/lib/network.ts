import { useSyncExternalStore } from 'react'

/**
 * รหัสของ ApiError ที่เกิดเพราะเน็ตหลุด ไม่ใช่เพราะเซิร์ฟเวอร์ตอบว่าผิด
 * ตั้งให้ต่างจากรหัสของ Go API (OS-xxx) จะได้ไม่ชนกัน
 */
export const OFFLINE_CODE = 'OFFLINE'

/*
  navigator.onLine บอกแค่ว่าเครื่องต่อ Wi-Fi/สายแลนอยู่หรือเปล่า ไม่ได้บอกว่าออกเน็ตได้จริง
  ต่อ Wi-Fi อยู่แต่เน็ตล่มก็ยังเป็น true จึงต้องมีธงนี้คู่กัน
  ชั้น API ตั้งธงเมื่อคำขอล้มเพราะเน็ต และล้างเมื่อมีคำขอไหนได้คำตอบกลับมา
*/
let connectionLost = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

// เบราว์เซอร์บอกว่ากลับมาต่อได้แล้ว เริ่มนับใหม่ คำขอถัดไปจะตัดสินเองว่ายังหลุดอยู่ไหม
window.addEventListener('online', () => {
  connectionLost = false
})

export function isOnline(): boolean {
  return navigator.onLine && !connectionLost
}

export function reportConnectionLost(): void {
  if (connectionLost) return
  connectionLost = true
  emit()
}

export function reportConnectionOk(): void {
  if (!connectionLost) return
  connectionLost = false
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

/** true เมื่อออกเน็ตได้ เปลี่ยนเองเมื่อเน็ตหลุดหรือกลับมา */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline)
}
