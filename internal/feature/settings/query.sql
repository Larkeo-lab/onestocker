-- name: GetUserSettings :one
select keywords_per_image, title_style, blocked_terms, output_languages, selected_platforms
from user_settings
where user_id = $1;

-- name: UpsertUserSettings :one
insert into user_settings (
  user_id, keywords_per_image, title_style, blocked_terms, output_languages, selected_platforms
) values ($1, $2, $3, $4, $5, $6)
on conflict (user_id) do update set
  keywords_per_image = excluded.keywords_per_image,
  title_style        = excluded.title_style,
  blocked_terms      = excluded.blocked_terms,
  output_languages   = excluded.output_languages,
  selected_platforms = excluded.selected_platforms,
  updated_at         = now()
returning keywords_per_image, title_style, blocked_terms, output_languages, selected_platforms;
