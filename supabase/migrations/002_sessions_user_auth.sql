alter table sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_sessions_user_created
  on sessions(user_id, created_at desc);
