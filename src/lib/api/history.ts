import type { GenerationWithPreview } from '@/types/generation'

import { apiDelete, apiGetPaginated, type Pagination } from './client'

export type HistoryQuery = {
  /** เริ่มที่ 1 */
  page?: number
  limit?: number
}

export type HistoryPage = {
  items: GenerationWithPreview[]
  pagination: Pagination
}

export async function fetchHistory(
  query: HistoryQuery = {},
): Promise<HistoryPage> {
  return apiGetPaginated<GenerationWithPreview[]>('/generations', {
    params: query,
  })
}

export async function deleteGeneration(id: string): Promise<void> {
  await apiDelete(`/generations/${id}`)
}
