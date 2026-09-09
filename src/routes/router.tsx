import { createBrowserRouter } from 'react-router-dom'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { ExportsPage } from '@/pages/ExportsPage'
import { GeneratePage } from '@/pages/GeneratePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlatformsPage } from '@/pages/PlatformsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'

import { RootLayout } from './RootLayout'

/** path ที่ประกาศที่นี่ต้องตรงกับ NAV_SECTIONS ใน config/nav.ts */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <GeneratePage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'platforms', element: <PlatformsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      // ต้องเป็น path แบบ catch-all เพราะ Clerk พาผู้ใช้ไปหน้าย่อยของตัวเอง
      // เช่น /sign-in/factor-one ตอนยืนยันสองขั้นตอน
      { path: 'sign-in/*', element: <SignInPage /> },
      { path: 'sign-up/*', element: <SignUpPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
