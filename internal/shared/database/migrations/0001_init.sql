-- โครงตารางเริ่มต้น
--
-- ไม่มี foreign key ชี้ไปที่ profiles โดยตั้งใจ เพราะเจ้าของตัวตนคือ Clerk
-- ไม่ใช่ตารางนี้ แถวใน generations เกิดขึ้นได้ก่อนที่โปรไฟล์จะถูกคัดลอกมา
-- ถ้าผูก FK ไว้ การบันทึกผลงานจะพังเพียงเพราะโปรไฟล์ยังไม่ถูก sync

create table if not exists profiles (
  user_id     text primary key,
  first_name  text,
  last_name   text,
  email       text,
  profile_url text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists user_settings (
  user_id            text primary key,
  keywords_per_image integer not null default 40,
  title_style        text    not null default 'descriptive',
  blocked_terms      text    not null default '',
  -- คั่นด้วยจุลภาค มี en เสมอ
  output_languages   text    not null default 'en',
  updated_at         timestamptz not null default now()
);

create table if not exists generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  filename    text not null,
  -- ตำแหน่งรูปย่อบน R2 เป็น null ได้ถ้ารูปถูกลบไปแล้ว
  preview_key text,
  title       text   not null default '',
  description text   not null default '',
  keywords    text[] not null default '{}',
  category    text,
  provider    text,
  model       text,
  created_at  timestamptz not null default now()
);

-- หน้า History อ่านของผู้ใช้คนเดียวเรียงใหม่ไปเก่าเสมอ
-- ดัชนีนี้ตอบทั้งการกรองและการเรียงในตัวเดียว
create index if not exists generations_user_created_idx
  on generations (user_id, created_at desc);
