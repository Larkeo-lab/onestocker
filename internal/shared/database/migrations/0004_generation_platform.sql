-- เพิ่ม platform_id เพื่อบันทึกว่า generate ด้วย platform ไหน
-- เป็น nullable เพราะ generation เก่าที่ทำก่อน migration นี้ไม่มีข้อมูล
alter table generations
  add column if not exists platform_id text;

-- ช่วยให้ filter ตาม platform เร็ว ไม่ต้อง seq scan ทั้งตาราง
create index if not exists generations_platform_idx
  on generations (user_id, platform_id, created_at desc);
