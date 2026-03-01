alter table sessions
  add column if not exists llm_provider text not null default 'mistral'
  check (llm_provider in ('mistral', 'minimax'));

