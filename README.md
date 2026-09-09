# one-stocks / server

Go + Fiber v3 API สำหรับ One Stock

## เริ่มใช้งาน

```bash
cp .env.example .env
make tools   # ติดตั้ง air (ครั้งแรกครั้งเดียว)
make dev     # live reload — แก้ไฟล์ .go แล้ว build ใหม่ให้เอง (~2 วิ)
```

เซิร์ฟเวอร์ขึ้นที่ `http://localhost:8080`

air ตั้งค่าให้ส่ง SIGINT ตอนรีสตาร์ท จึงผ่านเส้นทางปิดแบบ graceful
เหมือนตอนใช้งานจริง — ปัญหาเรื่องการปิดจะโผล่ตั้งแต่ตอน dev ไม่ใช่ตอน deploy
ถ้า build พังจะคงตัวเก่ารันต่อไว้ ดู `.air.toml`

## การตรวจสอบสิทธิ์

ทุกเส้นใต้ `/api` ต้องมี header `Authorization: Bearer <session token>`
ที่ Clerk ออกให้ ฝั่งนี้ตรวจลายเซ็นด้วยกุญแจสาธารณะจาก Clerk
(`internal/shared/clerkauth`) แล้วอ่าน `sub` มาเป็น userID

กุญแจถูกเก็บไว้ในหน่วยความจำ ไม่ได้ดึงใหม่ทุกคำขอ — ถ้าไม่เก็บ ทุกคำขอ
ของผู้ใช้จะกลายเป็นการเรียกข้ามเน็ตไปหา Clerk หนึ่งครั้ง ทั้งช้าและพัง
ทันทีถ้า Clerk ล่ม กุญแจหมดอายุใน 1 ชั่วโมง และถ้าเจอ `kid` ที่ไม่รู้จัก
จะดึงใหม่ทันที จึงรองรับการหมุนกุญแจอยู่แล้ว

เหตุผลที่ตรวจไม่ผ่านถูกเขียนลง log อย่างเดียว ไม่ตอบกลับไปให้ผู้เรียก
เพื่อไม่ให้กลายเป็นการบอกใบ้ว่าเดา token พลาดตรงไหน

### ระหว่างพัฒนา

`AUTH_DEV_BYPASS=true` ทำให้ทุกคำขอถูกนับเป็นผู้ใช้สมมติ `dev-user`
โดยไม่ตรวจ token — ใช้ตอนยังไม่มีคีย์ Clerk สำหรับเครื่อง dev

ตั้ง `AUTH_DEV_USER_ID` เป็น Clerk user id จริงเพื่อพัฒนากับข้อมูลของ
บัญชีนั้นบนเครื่องได้ เช่น `AUTH_DEV_USER_ID=user_3Itf...`

แฟล็กนี้ต้องเปิดเองแบบตั้งใจ ไม่ได้เดาจากการที่ `CLERK_SECRET_KEY` ยังว่าง
เพราะกติกาแบบนั้นทำให้ลืมตั้งคีย์แล้ว auth ถูกปิดเงียบ ๆ โดยไม่มีใครรู้
`config.Load` ไม่ยอมให้เซิร์ฟเวอร์สตาร์ทถ้าเปิดแฟล็กนี้ตอน `APP_ENV=production`

## โครงสร้าง

แบ่งตาม feature ไม่ได้แบ่งตามชั้น — แต่ละ feature มี controller, router,
validation, service ของตัวเองอยู่ในโฟลเดอร์เดียวกัน แก้เรื่องไหนก็เปิดโฟลเดอร์นั้น
ของที่ใช้ร่วมกันทุก feature อยู่ใน `internal/shared/`

```
cmd/api/                  จุดเริ่มโปรแกรม + ปิดแบบ graceful
internal/
  router/                 ประกอบ app แล้ว mount ทุก feature
  feature/
    auth/                 ตัวตนของผู้ใช้      GET    /api/auth/me
    settings/             ค่าตั้งต้นของผู้ใช้   GET    /api/settings
                                            PUT    /api/settings
    upload/               ลิงก์อัปขึ้น R2     POST   /api/uploads/presign
    generate/             สร้าง metadata     POST   /api/generate
    generation/           ประวัติ            GET    /api/generations
                                            DELETE /api/generations/:id
    meta/                 ค่าคงที่ของระบบ     GET    /api/meta
  shared/
    config/               อ่าน environment ที่เดียว
    response/             รูปแบบ JSON ที่ตอบกลับ
    apperr/               error ที่รู้ status ของตัวเอง + ErrorHandler กลาง
    validation/           ต่อ ozzo-validation เข้ากับ Fiber
    clerkauth/            ตรวจลายเซ็น token ของ Clerk + cache กุญแจ
    middleware/           auth (ตรวจ token)
    storage/              R2 (S3-compatible) — presign + อ่านไฟล์
    database/             pool + migration ที่รันเองตอนสตาร์ท
      migrations/         ไฟล์ SQL เรียงตามเลขนำหน้า
      sqlc/               โค้ดที่ sqlc generate — ห้ามแก้มือ
    util/                 ptr, จัดการ string
```

`GET /healthz` อยู่นอกด่านล็อกอิน สำหรับ health check ของ load balancer

### หน้าที่ของแต่ละไฟล์ใน feature

| ไฟล์ | หน้าที่ |
|---|---|
| `dto.go` | รูปร่างของ request/response ต้องตรงกับ type ฝั่ง client |
| `validation.go` | กฎตรวจข้อมูลของ feature นี้ เขียนด้วย ozzo-validation |
| `query.sql` | SQL ของ feature นี้ sqlc อ่านไป generate โค้ด |
| `repository.go` | คุยกับฐานข้อมูล แปลงจากแถวเป็น type ของ feature |
| `service.go` | ตรรกะทางธุรกิจ ไม่รู้จัก HTTP เลย |
| `controller.go` | แปลง HTTP เข้า/ออก แล้วเรียก service |
| `router.go` | ประกาศเส้นทางของ feature นี้ |

## รูปแบบคำตอบ

ทุกเส้นตอบรูปร่างเดียวกันหมด ทั้งตอนสำเร็จและตอนพลาด

```jsonc
// สำเร็จ
{ "code": "OS-200", "message": "SUCCESS", "data": { } }

// มีการแบ่งหน้า
{ "code": "OS-200", "message": "SUCCESS", "data": [],
  "pagination": { "page": 1, "limit": 30, "total": 0, "totalPages": 0 } }

// พลาด — data เป็น null เสมอ
{ "code": "OS-400", "message": "ต้องระบุ outputLanguages", "data": null }

// เซิร์ฟเวอร์พัง (5xx) แนบ requestId มาให้ตามหาใน log
{ "code": "OS-500", "message": "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
  "data": null, "requestId": "aG27L896KTR..." }
```

handler ห้ามเรียก `c.JSON` เอง ให้เรียกผ่าน `shared/response` เสมอ

ข้อความ error ของ Fiber เอง (404, 405, 413) ถูกแปลเป็นไทยใน
`shared/apperr/handler.go` จะได้ไม่ปนอังกฤษกับข้อความของเรา

## ยังไม่ได้ทำ

| เส้น | สถานะ |
|---|---|
| `POST /api/generate` | 501 — ต้องต่อ Gemini (ดึงรูปจาก R2 พร้อมแล้ว) |
| `GET /api/generations` | อ่านจาก Neon ได้แล้ว แต่ `previewUrl` ยังเป็น null (รอ R2) |

ชั้นที่ยังไม่มีคือ `repository/` — จะเพิ่มในแต่ละ feature ตอนต่อ Neon
เพื่อคั่นระหว่าง service กับ SQL

## คำสั่ง

```bash
make tools   # ติดตั้ง air (ล็อกเวอร์ชันไว้ใน Makefile)
make dev     # รันแบบ live reload
make run     # รันครั้งเดียวไม่ต้อง watch
make build   # build ไป bin/api
make lint    # gofmt + go vet
make test
make clean   # ลบ bin/ tmp/ build-errors.log
```

## ต่อกับหน้าเว็บ

```bash
# เทอร์มินัลที่ 1
cd one-stocks/server && make dev

# เทอร์มินัลที่ 2
cd one-stocks/client/one-stock && pnpm dev
```

หน้าเว็บอ่าน `VITE_API_URL` จาก `.env` ค่าเริ่มต้นคือ `http://localhost:8080/api`
และ `ALLOWED_ORIGINS` ฝั่งนี้เปิดให้ `http://localhost:5173` อยู่แล้ว

`GET /api/meta` เป็นแหล่งความจริงเดียวของเพดานจำนวนรูปกับรายการภาษา
หน้าเว็บอ่านค่าจากที่นี่แทนการเขียนตัวเลขไว้เอง

## Validation

ใช้ [ozzo-validation](https://github.com/go-ozzo/ozzo-validation) — กฎเป็นโค้ด
ไม่ใช่ tag แต่ละ DTO ทำเมธอด `Validate()` ไว้ใน `validation.go` ของ feature ตัวเอง
Fiber เรียกให้อัตโนมัติตอน `c.Bind().Body()` ผ่าน `fiber.Config.StructValidator`

ข้อดีเทียบกับ tag คือเขียนกฎที่อ้างอิงหลายฟิลด์หรือต้องคำนวณได้ตรง ๆ
และคอมไพเลอร์ช่วยจับตอนเปลี่ยนชื่อฟิลด์ ไม่ใช่ไปพังตอน runtime

ชื่อฟิลด์ในข้อความ error มาจาก tag `json` ส่วน error ของรายการจะถูกยุบ
ให้อ่านง่ายเป็น `items[2].filename ต้องระบุ` โดย `shared/validation`

## ฐานข้อมูล

Neon (Postgres) ต่อผ่าน pgx ส่วนโค้ดที่คุยกับฐานข้อมูลใช้
[sqlc](https://sqlc.dev) generate จาก SQL — ไม่ใช่ ORM จึงไม่มีโปรเซส
หรือ reflection เพิ่มตอนรัน และ SQL ที่วิ่งจริงคือสิ่งที่เขียนไว้ทุกตัวอักษร

```bash
make sqlc    # generate ใหม่หลังแก้ query.sql หรือเพิ่ม migration
```

sqlc ไม่แตะฐานข้อมูลเลย มันอ่านโครงตารางจากไฟล์ใน `migrations/`
ชุดเดียวกับที่รันจริง โค้ดกับฐานข้อมูลจึงไม่มีทางไม่ตรงกัน

### migration

รันเองตอนสตาร์ท ไม่ต้องสั่งแยก ตัวที่รันไปแล้วถูกบันทึกใน `schema_migrations`
แต่ละไฟล์รันในหนึ่ง transaction และมี advisory lock กันไม่ให้เซิร์ฟเวอร์
หลายตัวที่สตาร์ทพร้อมกันรันซ้อนกัน

เพิ่มตารางใหม่: สร้างไฟล์ `migrations/0002_xxx.sql` แล้วสตาร์ทใหม่

### ตาราง

| ตาราง | เก็บอะไร |
|---|---|
| `profiles` | สำเนาโปรไฟล์จาก Clerk ไว้ join กับตารางอื่น |
| `user_settings` | ค่าตั้งต้นของผู้ใช้ |
| `generations` | ประวัติ metadata ที่สร้างไว้ |

ไม่มี foreign key ชี้ไป `profiles` โดยตั้งใจ — เจ้าของตัวตนคือ Clerk
ถ้าผูก FK ไว้ การบันทึกผลงานจะพังเพียงเพราะโปรไฟล์ยังไม่ถูก sync

ทุก query ที่แตะข้อมูลของผู้ใช้มี `user_id` อยู่ในเงื่อนไขเสมอ
รวมถึงตอนลบ ไม่งั้นใครรู้ id ก็ลบของคนอื่นได้

### ย้ายข้อมูลจาก Supabase

ทำไปแล้วครั้งหนึ่ง (11 profiles / 2 settings / 213 generations)
สคริปต์อยู่ที่ `scripts/migrate-from-supabase.sh` รันซ้ำได้ไม่พัง

```bash
SUPABASE_URL='postgresql://postgres.xxx:PASSWORD@aws-0-...pooler.supabase.com:5432/postgres' \
  ./scripts/migrate-from-supabase.sh
```

ใช้พอร์ต 5432 (session mode) ไม่ใช่ 6543 (transaction pooler)

## ที่เก็บรูป (R2)

เก็บเฉพาะรูปย่อ (webp) ไฟล์ต้นฉบับอยู่ในเครื่องผู้ใช้เท่านั้น
เบราว์เซอร์อัปตรงขึ้น R2 ด้วย presigned URL ไม่ผ่านเซิร์ฟเวอร์นี้เลย
จึงไม่กินแบนด์วิดท์และหน่วยความจำของ EC2

ชื่อไฟล์บน R2 เป็น `<user id>/<ชื่อรูป>.webp` — ต้องขึ้นต้นด้วย user id
เพราะถ้าสองคนอัปไฟล์ชื่อเดียวกัน ของคนหลังจะทับของคนแรก
และทุกครั้งที่รับ key จากหน้าเว็บต้องเช็คว่าเป็นของผู้ใช้คนนั้นจริง
(`storage.OwnedBy`) ไม่งั้นเดา key ของคนอื่นแล้วเปิดดูได้

### ต้องตั้ง CORS ของ bucket

เบราว์เซอร์อัปตรงขึ้น R2 โดเมนที่ยิงเข้ามาจึงต้องอยู่ในรายการที่อนุญาต
ตั้งที่ Cloudflare Dashboard → R2 → bucket → Settings → CORS Policy

```json
[
  {
    "AllowedOrigins": ["https://meta.eezypos.com", "http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3000
  }
]
```

ถ้าไม่มี origin ของตัวเองอยู่ในรายการ เบราว์เซอร์จะได้ 403 ตั้งแต่ preflight
ทั้งที่ presigned URL ถูกต้อง — อาการคืออัปไม่ขึ้นแต่เซิร์ฟเวอร์ไม่มี log อะไรเลย

### ตัวเลือกที่ต้องตั้งเป็นพิเศษ

`RequestChecksumCalculation: WhenRequired` — SDK รุ่นใหม่ใส่ checksum CRC32
ให้อัตโนมัติ แต่ตอน presign ยังไม่มีเนื้อไฟล์ จึงได้ checksum ของไฟล์เปล่า
ติดไปใน URL แล้วอัปไม่ผ่านเพราะไม่ตรงกับไฟล์จริง
