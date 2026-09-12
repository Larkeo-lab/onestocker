-- เพิ่มคอลัมน์ selected_platforms ในตาราง user_settings เพื่อเก็บแพลตฟอร์มที่ผู้ใช้เลือกสำหรับ export
alter table user_settings
  add column if not exists selected_platforms text not null default 'adobe-stock';
