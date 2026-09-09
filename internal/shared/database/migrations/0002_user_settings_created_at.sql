-- ตารางเดิมบน Supabase มีคอลัมน์นี้ เพิ่มไว้เพื่อย้ายข้อมูลมาได้ครบ
-- ไม่ได้ใช้ในโค้ดตอนนี้ แต่เก็บไว้ดีกว่าทิ้งประวัติไป
alter table user_settings
  add column if not exists created_at timestamptz not null default now();
