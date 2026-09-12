import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_PLATFORM_IDS, PLATFORMS, type Platform } from '@/config/platforms'
import { fetchSettings, saveSettings } from '@/lib/api/settings'

type PlatformsState = {
  selectedIds: string[]
  activePlatformId: string
  initialized: boolean
  togglePlatform: (id: string) => Promise<void>
  setSelectedIds: (ids: string[], saveToDb?: boolean) => Promise<void>
  setActivePlatformId: (id: string) => void
  loadFromBackend: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const usePlatformsStore = create<PlatformsState>()(
  persist(
    (set, get) => ({
      selectedIds: DEFAULT_PLATFORM_IDS,
      activePlatformId: 'adobe-stock',
      initialized: false,

      setActivePlatformId: (id: string) => set({ activePlatformId: id }),

      loadFromBackend: async () => {
        try {
          const settings = await fetchSettings()
          if (settings && settings.selectedPlatforms) {
            const ids = settings.selectedPlatforms
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            const finalIds = ids.length > 0 ? ids : DEFAULT_PLATFORM_IDS
            const currentActive = get().activePlatformId
            const activeId = finalIds.includes(currentActive)
              ? currentActive
              : finalIds[0]

            set({
              selectedIds: finalIds,
              activePlatformId: activeId,
              initialized: true,
            })
          } else {
            set({ selectedIds: DEFAULT_PLATFORM_IDS, initialized: true })
          }
        } catch {
          // ถ้ายังไม่ได้ล็อกอินหรือต่อ API ไม่ติด จะใช้ค่าตั้งต้น ['adobe-stock']
        }
      },

      setSelectedIds: async (ids: string[], saveToDb = true) => {
        const finalIds = ids.length > 0 ? ids : DEFAULT_PLATFORM_IDS
        const currentActive = get().activePlatformId
        const activeId = finalIds.includes(currentActive)
          ? currentActive
          : finalIds[0]

        set({ selectedIds: finalIds, activePlatformId: activeId })
        if (saveToDb) {
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(async () => {
            try {
              const current = await fetchSettings().catch(() => null)
              if (current) {
                await saveSettings({
                  ...current,
                  selectedPlatforms: finalIds.join(','),
                })
              }
            } catch {
              // ละเว้น error ตอนซิงก์ฉากหลัง
            }
          }, 400)
        }
      },

      togglePlatform: async (id: string) => {
        const currentIds = get().selectedIds
        const nextIds = currentIds.includes(id)
          ? currentIds.filter((p) => p !== id)
          : [...currentIds, id]
        await get().setSelectedIds(nextIds, true)
      },
    }),
    {
      name: 'one-stock-selected-platforms',
    },
  ),
)

export function getSelectedPlatforms(selectedIds: string[]): Platform[] {
  const ids = selectedIds.length > 0 ? selectedIds : DEFAULT_PLATFORM_IDS
  return PLATFORMS.filter((p) => ids.includes(p.id))
}
