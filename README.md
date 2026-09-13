# one-stocks / client / one-stock

หน้าเว็บของ Onestocks — หน้า landing สาธารณะ และตัวแอปที่ผู้ใช้ล็อกอินเข้ามาสร้าง metadata

React + Vite + Tailwind, ล็อกอินด้วย Clerk, คุยกับ Go API ใน `one-stocks/server`

## เริ่มใช้งาน

```bash
cp .env.example .env   # เติมค่าตามคำอธิบายในไฟล์
pnpm install
pnpm dev               # http://localhost:5173
```

ต้องรัน `one-stocks/server` คู่กันด้วย (`make dev`) หน้าเว็บอ่าน API จาก `VITE_API_URL`

## คำสั่ง

```bash
pnpm dev         # รันแบบ live reload
pnpm build       # tsc + vite build + render หน้า landing ทุกภาษาเป็น HTML นิ่ง
pnpm lint        # oxlint
pnpm deploy:cf   # build แล้ว deploy ขึ้น Cloudflare (wrangler.jsonc)
```

## หน้า landing กับตัวแอป

- `/`, `/th`, `/lo` — หน้า landing หนึ่งหน้าต่อภาษา ถูก render เป็น HTML นิ่งตอน build
  (`scripts/prerender.mjs`) ไม่มี React ทำงานบนหน้านี้ ดูกติกาใน `src/landing/LandingPage.tsx`
- `/app/*`, `/sign-in`, `/sign-up` — ตัวแอป โหลดแยกด้วย `import()` จาก `src/main.tsx`

## ภาษา

ข้อความทุกตัวบนหน้าจออยู่ใน `src/config/messages/<ภาษา>.json` (en, th, lo) ใช้ผ่าน i18next

- เพิ่มข้อความใหม่ที่ `en.json` ก่อน แล้วค่อยเติม `th.json` กับ `lo.json`
- ภาษาไหนขาด key หรือในโค้ดพิมพ์ key ผิด `pnpm build` จะไม่ผ่าน
- ภาษาตั้งต้นคืออังกฤษ ภาษาที่เลือกถูกจำไว้ใน localStorage ใช้ร่วมกันทั้งหน้า landing และตัวแอป
- รายการภาษา ธง และ path ของหน้า landing อยู่ใน `src/config/languages.ts`
