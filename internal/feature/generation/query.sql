-- name: ListGenerations :many
-- ใหม่ไปเก่า ใช้ดัชนี generations_user_created_idx ตอบได้ทั้งกรองและเรียง
select id, filename, preview_key, title, description,
       keywords, category, provider, model, created_at
from generations
where user_id = $1
order by created_at desc
limit $2 offset $3;

-- name: CountGenerations :one
select count(*) from generations where user_id = $1;

-- name: DeleteGeneration :execrows
-- ต้องเช็ค user_id ด้วย ไม่งั้นใครรู้ id ก็ลบของคนอื่นได้
delete from generations where id = $1 and user_id = $2;

-- name: InsertGeneration :one
insert into generations (
  user_id, filename, preview_key, title, description,
  keywords, category, provider, model
) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
returning id, filename, preview_key, title, description,
          keywords, category, provider, model, created_at;
