import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

import { env } from '@/lib/env'

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

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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

// แปลง error ของ axios ให้เหลือข้อความเดียวที่เอาไปแสดงได้เลย
// ฝั่ง Go ตอบ { code, message, data: null } เวลาเกิดปัญหา
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)

    const status = error.response?.status ?? 0
    const body = error.response?.data as
      | { message?: string; code?: string; requestId?: string }
      | undefined

    const message =
      body?.message ??
      (status === 0 ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้' : error.message)

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
