-- name: UpsertProfile :one
-- คัดลอกข้อมูลผู้ใช้จาก Clerk มาเก็บไว้ฝั่งเรา
-- เพื่อให้ join กับตารางอื่นได้โดยไม่ต้องยิงไปถาม Clerk ทุกครั้ง
--
-- user_type ไม่อยู่ในทั้งชุดที่ insert และชุดที่ update โดยตั้งใจ
-- Clerk ไม่ใช่เจ้าของค่านี้ ตอนสร้างแถวใหม่จึงปล่อยให้เป็น default ของคอลัมน์
-- และตอน sync โปรไฟล์ก็อ่านค่าเดิมกลับมาเฉย ๆ ไม่เขียนทับระดับที่ซื้อไว้
insert into profiles (user_id, first_name, last_name, email, profile_url)
values ($1, $2, $3, $4, $5)
on conflict (user_id) do update set
  first_name  = excluded.first_name,
  last_name   = excluded.last_name,
  email       = excluded.email,
  profile_url = excluded.profile_url,
  updated_at  = now()
returning user_id, first_name, last_name, email, profile_url, user_type;
