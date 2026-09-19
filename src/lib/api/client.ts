import axios, { AxiosError } from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

import i18n, { currentLanguage } from '@/config/i18n'
import { env } from '@/lib/env'
import {
  OFFLINE_CODE,
  reportConnectionLost,
  reportConnectionOk,
} from '@/lib/network'

/**
 * รูปร่างคำตอบของ Go API ทุกเส้นตอบเหมือนกันหมด
 * ดู server/internal/shared/response/response.go
 */
export type ApiEnvelope<T> = {
  /** เช่น "OS-200" */
  code: string
  /** "SUCCESS" ตอนสำเร็จ หรือข้อความบอกสาเหตุตอนพลาด */
  message: string
  data: T
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ApiPaginated<T> = ApiEnvelope<T> & {
  pagination: Pagination
  availablePlatforms?: string[]
}

/**
 * axios instance เดียวของแอป ทุก request ไป Go API ต้องผ่านตัวนี้
 * (ยกเว้นการอัปไฟล์ขึ้น R2 ด้วย presigned URL ดู uploads.ts)
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  // generate หนึ่งรูปใช้เวลา 5-10 วิ เผื่อไว้ให้พอสำหรับตอน API ช้า
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * ตัวดึง access token
 *
 * แยกออกมาแบบนี้เพื่อไม่ให้ชั้น API ผูกกับ Clerk ตอนเปลี่ยนวิธี auth
 * แก้แค่ที่เดียวคือจุดที่เรียก setAuthTokenGetter (ดู main.tsx)
 */
type TokenGetter = () => Promise<string | null> | string | null

let getToken: TokenGetter = () => null

export function setAuthTokenGetter(getter: TokenGetter): void {
  getToken = getter
}

/*
  คำขอที่ออกไปโดยไม่มี token ทั้งที่ล็อกอินอยู่

  ตอนเน็ตหลุด Clerk ต่ออายุ token ไม่ได้ getToken จะคืน null หรือโยน error
  ถ้าเซิร์ฟเวอร์ยังต่อถึง (เช่น API อยู่บน localhost ตอน dev) จะตอบ 401 กลับมา
  ซึ่งไม่ใช่ session หมดอายุจริง — ใช้ชุดนี้แยกสองกรณีออกจากกัน
*/
const sentWithoutToken = new WeakSet<object>()

api.interceptors.request.use(async (config) => {
  let token: string | null = null
  try {
    token = await getToken()
  } catch {
    // ปล่อยให้คำขอออกไปก่อน ถ้าเป็นเพราะเน็ตหลุดจริง ตัวดักคำตอบด้านล่างจะแปลงเป็น offline ให้
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  else sentWithoutToken.add(config)
  /*
    บอกภาษาที่เลือกในแอปกับทุกคำขอ เซิร์ฟเวอร์เก็บไว้ตอน /auth/me ใช้ส่งอีเมลให้ตรงภาษา
    ชื่อ header ต้องตรงกับ auth.LanguageHeader และอยู่ใน AllowHeaders ของ CORS ฝั่ง Go
  */
  config.headers['X-App-Language'] = currentLanguage()
  return config
})

/**
 * รหัสของ error เมื่อฟีเจอร์กำลังปิดปรับปรุง (เครดิตหรือ key ของผู้ให้บริการฝั่งเรามีปัญหา รอแอดมินแก้)
 * ลูกค้าไม่ต้องรู้สาเหตุจริง แสดงข้อความปิดปรับปรุงตามภาษาของแอปแทนข้อความจากเซิร์ฟเวอร์
 * ต้องตรงกับ apperr.CodeMaintenance ฝั่ง Go
 */
export const MAINTENANCE_CODE = 'OS-MAINTENANCE'

/** error ที่มีทั้ง HTTP status และรหัสจากเซิร์ฟเวอร์ติดมาด้วย */
export class ApiError extends Error {
  status: number
  /** รหัสจาก envelope เช่น "OS-403" ว่างได้ถ้าต่อเซิร์ฟเวอร์ไม่ติด */
  code: string
  /** มีเฉพาะตอนเซิร์ฟเวอร์พัง เอาไว้แจ้งให้ตามหาใน log */
  requestId?: string

  constructor(
    message: string,
    status: number,
    code = '',
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

/**
 * คำขอนี้ล้มเพราะเน็ตหลุดหรือเปล่า
 *
 * ERR_NETWORK แยกไม่ออกว่าเน็ตผู้ใช้หลุดหรือเซิร์ฟเวอร์ล่ม แต่ทั้งสองกรณี
 * ผู้ใช้ทำอะไรไม่ได้นอกจากรอแล้วลองใหม่ จึงแสดงแบบเดียวกัน
 * ส่วน timeout ไม่นับ เพราะแปลว่ายังต่อถึงแค่ช้า
 */
function isConnectionFailure(error: AxiosError): boolean {
  if (!navigator.onLine) return true
  if (error.code === AxiosError.ERR_NETWORK) return true
  return (
    error.response?.status === 401 &&
    error.config !== undefined &&
    sentWithoutToken.has(error.config)
  )
}

// แปลง error ของ axios ให้เหลือข้อความเดียวที่เอาไปแสดงได้เลย
// ฝั่ง Go ตอบ { code, message, data: null } เวลาเกิดปัญหา
api.interceptors.response.use(
  (response) => {
    reportConnectionOk()
    return response
  },
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    if (isConnectionFailure(error)) {
      reportConnectionLost()
      return Promise.reject(
        new ApiError(
          i18n.t('errors.offline'),
          error.response?.status ?? 0,
          OFFLINE_CODE,
        ),
      )
    }
    // เซิร์ฟเวอร์ตอบกลับมาได้ แปลว่าเน็ตใช้ได้ ถึงคำตอบจะเป็น error ก็ตาม
    if (error.response) reportConnectionOk()

    const status = error.response?.status ?? 0
    const body = error.response?.data as
      | { message?: string; code?: string; requestId?: string }
      | undefined

    const message =
      body?.code === MAINTENANCE_CODE
        ? i18n.t('errors.maintenance')
        : (body?.message ??
          (status === 0 ? i18n.t('errors.network') : error.message))

    return Promise.reject(
      new ApiError(message, status, body?.code ?? '', body?.requestId),
    )
  },
)

/*
 * ตัวช่วยด้านล่างแกะ data ออกจาก envelope ให้แล้ว
 * โมดูลอื่นจึงเรียกใช้ได้เหมือนกับว่า API ตอบข้อมูลตรง ๆ
 * ไม่ต้องเขียน .data.data ทุกที่
 */

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url, config)
  return response.data.data
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(url, body, config)
  return response.data.data
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(url, body, config)
  return response.data.data
}

export async function apiDelete<T = null>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.delete<ApiEnvelope<T>>(url, config)
  return response.data.data
}

/** เหมือน apiGet แต่คืนข้อมูลการแบ่งหน้ามาด้วย */
export async function apiGetPaginated<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ items: T; pagination: Pagination; availablePlatforms?: string[] }> {
  const response = await api.get<ApiPaginated<T>>(url, config)
  return {
    items: response.data.data,
    pagination: response.data.pagination,
    availablePlatforms: response.data.availablePlatforms,
  }
}
