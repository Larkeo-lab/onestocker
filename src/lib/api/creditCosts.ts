import type { CreditCosts } from '@/types/creditCost'

import { apiGet } from './client'

/** เครดิตต่อหนึ่งครั้งของแต่ละงาน เส้นสาธารณะ ต้องตรงกับ quota.RegisterPublic ฝั่ง Go */
export async function fetchCreditCosts(): Promise<CreditCosts> {
  return apiGet<CreditCosts>('/public/credit-costs')
}
