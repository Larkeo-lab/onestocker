import { createBrowserRouter } from 'react-router-dom'

import { AuthLayout } from '@/components/auth/AuthLayout'
import { APP_PATH } from '@/config/site'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { ExportsPage } from '@/pages/ExportsPage'
import { GeneratePage } from '@/pages/GeneratePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LandingRedirect } from '@/pages/LandingRedirect'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PlatformsPage } from '@/pages/PlatformsPage'
import { RemoveBgPage } from '@/pages/RemoveBgPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'

import { RootLayout } from './RootLayout'

/** path ที่ประกาศที่นี่ต้องตรงกับ NAV_SECTIONS ใน config/nav.ts */
export const router = createBrowserRouter([
  /*
    หน้า / เป็นหน้า landing ที่ build เป็น HTML นิ่ง ไม่ได้อยู่ใน react-router
    ถ้ามีอะไรในแอปพาผู้ใช้มาที่ / แบบไม่โหลดหน้าใหม่ ต้องสั่งโหลดใหม่ทั้งหน้า
    ไม่งั้นจะตกไปที่ NotFoundPage
  */
  { path: '/', element: <LandingRedirect /> },
  {
    path: APP_PATH,
    element: <RootLayout />,
    children: [
      { index: true, element: <GeneratePage /> },
      { path: 'remove-bg', element: <RemoveBgPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'platforms', element: <PlatformsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'checkout/:plan', element: <CheckoutPage /> },
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
