#!/usr/bin/env bash
#
# ย้ายข้อมูลจาก Supabase (ของเดิม) มา Neon (ของใหม่)
#
# รันซ้ำได้ไม่พัง — แถวที่มีอยู่แล้วจะถูกอัปเดตทับด้วยข้อมูลจากต้นทาง
# ไม่ได้ลบแถวที่ปลายทางมีแต่ต้นทางไม่มี
#
# วิธีใช้:
#   SUPABASE_URL='postgresql://postgres:...@db.xxx.supabase.co:5432/postgres' \
#     ./scripts/migrate-from-supabase.sh
#
# หา connection string ได้ที่ Supabase Dashboard
#   → Project Settings → Database → Connection string → URI

set -euo pipefail

if [[ -z "${SUPABASE_URL:-}" ]]; then
  echo "ต้องตั้ง SUPABASE_URL ก่อน (connection string ของ Supabase)" >&2
  exit 1
fi

# ปลายทางอ่านจาก .env ของเซิร์ฟเวอร์
NEON_URL="${DATABASE_URL:-}"
if [[ -z "$NEON_URL" && -f .env ]]; then
  NEON_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
fi
if [[ -z "$NEON_URL" ]]; then
  echo "ไม่พบ DATABASE_URL ทั้งใน environment และใน .env" >&2
  exit 1
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "── ตรวจต้นทาง ─────────────────────────────"
psql "$SUPABASE_URL" -qtAX -c "
  select 'profiles      : ' || count(*) from public.profiles
  union all select 'user_settings : ' || count(*) from public.user_settings
  union all select 'generations   : ' || count(*) from public.generations;"

# s3_key มีเฉพาะในสคีมาเดิม ปลายทางไม่มีคอลัมน์นี้
# ไฟล์ต้นฉบับไม่เคยถูกอัปขึ้นคลาวด์ ค่านี้จึงควรว่างทั้งหมด
ORPHAN=$(psql "$SUPABASE_URL" -qtAX -c \
  "select count(*) from public.generations where s3_key is not null;")
if [[ "$ORPHAN" != "0" ]]; then
  echo "เตือน: มี $ORPHAN แถวที่มีค่า s3_key ซึ่งปลายทางไม่มีคอลัมน์นี้ ค่าจะหายไป" >&2
fi

echo
echo "── ดึงข้อมูลออกมาเป็น CSV ──────────────────"
psql "$SUPABASE_URL" -qX -c "\copy (
  select user_id, first_name, last_name, email, profile_url, created_at, updated_at
  from public.profiles order by created_at
) to '$WORK/profiles.csv' with csv"

psql "$SUPABASE_URL" -qX -c "\copy (
  select user_id, keywords_per_image, title_style, blocked_terms,
         output_languages, created_at, updated_at
  from public.user_settings
) to '$WORK/user_settings.csv' with csv"

psql "$SUPABASE_URL" -qX -c "\copy (
  select id, user_id, filename, preview_key, title, description,
         keywords, category, provider, model, created_at
  from public.generations order by created_at
) to '$WORK/generations.csv' with csv"

wc -l "$WORK"/*.csv | sed 's|.*/|  |'

echo
echo "── นำเข้า Neon ────────────────────────────"
# ใช้ตารางพักก่อน แล้วค่อย upsert เข้าตารางจริง
# ทำแบบนี้เพื่อให้รันซ้ำได้โดยไม่ชน primary key
psql "$NEON_URL" -qX <<SQL
begin;

create temp table stage_profiles (like profiles including defaults) on commit drop;
\copy stage_profiles (user_id, first_name, last_name, email, profile_url, created_at, updated_at) from '$WORK/profiles.csv' with csv
insert into profiles select * from stage_profiles
  on conflict (user_id) do update set
    first_name  = excluded.first_name,
    last_name   = excluded.last_name,
    email       = excluded.email,
    profile_url = excluded.profile_url,
    updated_at  = excluded.updated_at;

create temp table stage_settings (
  user_id text, keywords_per_image integer, title_style text,
  blocked_terms text, output_languages text,
  created_at timestamptz, updated_at timestamptz
) on commit drop;
\copy stage_settings from '$WORK/user_settings.csv' with csv
insert into user_settings (user_id, keywords_per_image, title_style,
                           blocked_terms, output_languages, created_at, updated_at)
  select * from stage_settings
  on conflict (user_id) do update set
    keywords_per_image = excluded.keywords_per_image,
    title_style        = excluded.title_style,
    blocked_terms      = excluded.blocked_terms,
    output_languages   = excluded.output_languages,
    created_at         = excluded.created_at,
    updated_at         = excluded.updated_at;

create temp table stage_generations (
  id uuid, user_id text, filename text, preview_key text, title text,
  description text, keywords text[], category text, provider text,
  model text, created_at timestamptz
) on commit drop;
\copy stage_generations from '$WORK/generations.csv' with csv
insert into generations (id, user_id, filename, preview_key, title, description,
                         keywords, category, provider, model, created_at)
  select * from stage_generations
  on conflict (id) do update set
    filename    = excluded.filename,
    preview_key = excluded.preview_key,
    title       = excluded.title,
    description = excluded.description,
    keywords    = excluded.keywords,
    category    = excluded.category,
    provider    = excluded.provider,
    model       = excluded.model;

commit;
SQL

echo
echo "── ตรวจปลายทาง ────────────────────────────"
psql "$NEON_URL" -qtAX -c "
  select 'profiles      : ' || count(*) from profiles
  union all select 'user_settings : ' || count(*) from user_settings
  union all select 'generations   : ' || count(*) from generations;"

echo
echo "เสร็จแล้ว"
