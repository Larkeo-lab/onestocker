import {
  FileSpreadsheet,
  History,
  Images,
  Store,
  WandSparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  /** path ต้องตรงกับที่ประกาศไว้ใน routes/router.tsx */
  to: string
  icon: LucideIcon
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Generate', to: '/', icon: WandSparkles },
      { label: 'Library', to: '/library', icon: Images },
      { label: 'History', to: '/history', icon: History },
      { label: 'Exports', to: '/exports', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Configuration',
    items: [{ label: 'Platforms', to: '/platforms', icon: Store }],
  },
]
