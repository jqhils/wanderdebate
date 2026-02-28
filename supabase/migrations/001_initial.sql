-- 001_initial.sql

create table sessions (
  id uuid primary key default gen_random_uuid(),
  destination text not null,
  duration_hours numeric not null,
  agents text[] not null default '{"flaneur","completionist"}',
  status text not null default 'setup'
    check (status in ('setup', 'debating', 'paused', 'complete')),
  created_at timestamptz not null default now()
);

create table itinerary_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  version_number int not null,
  agent_id text not null,
  commentary text not null default '',
  days jsonb not null default '[]',
  changes_summary jsonb default null,   -- {dropped: [...], added: [...]} computed vs previous version
  created_at timestamptz not null default now(),
  unique (session_id, version_number)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  agent_id text not null,
  role text not null check (role in ('proposal', 'critique', 'merge', 'system', 'user-input')),
  content text not null,
  related_version_id uuid references itinerary_versions(id),
  created_at timestamptz not null default now()
);

-- Index for loading a session's history
create index idx_versions_session on itinerary_versions(session_id, version_number);
create index idx_messages_session on chat_messages(session_id, created_at);

-- Enable realtime for live debate watching
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table itinerary_versions;
