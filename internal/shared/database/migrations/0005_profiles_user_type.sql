-- ระดับแพ็กเกจของผู้ใช้
--
-- ผู้ใช้เดิมทุกคนได้ FREE จาก default ไม่ต้อง backfill แยก
-- และคอลัมน์นี้ไม่ได้อยู่ในชุดที่ UpsertProfile เขียนทับ การ sync โปรไฟล์
-- จาก Clerk ทุกครั้งจึงไม่ลดระดับคนที่จ่ายเงินแล้วกลับไปเป็น FREE
--
-- เก็บเป็น text + check แทน enum ของ Postgres โดยตั้งใจ
-- เพิ่มระดับใหม่ทีหลังแก้ที่ constraint ที่เดียว ไม่ต้อง alter type
-- ซึ่งย้อนกลับไม่ได้ ฝั่ง Go ยังบังคับค่าอีกชั้นที่ internal/shared/usertype
alter table profiles
  add column if not exists user_type text not null default 'FREE';

-- เขียนแบบ drop-then-add เพื่อให้รันซ้ำได้ Postgres ไม่มี
-- add constraint if not exists ให้ใช้
alter table profiles
  drop constraint if exists profiles_user_type_check;

alter table profiles
  add constraint profiles_user_type_check
    check (user_type in ('FREE', 'PLUS', 'PRO', 'ULTRA'));
