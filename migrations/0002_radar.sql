-- Pre-Move Radar: unowned market-signal history (no user_id).
create table if not exists radar_events (
  id serial primary key,
  symbol text not null,
  venue text not null,
  bias text not null,
  state text not null,
  score integer not null,
  price double precision not null,
  headline text not null,
  action_note text not null default '',
  reasons jsonb not null default '[]'::jsonb,
  factors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists radar_events_symbol_created_idx
  on radar_events (symbol, created_at desc);
create index if not exists radar_events_created_idx
  on radar_events (created_at desc);
create index if not exists radar_events_state_created_idx
  on radar_events (state, created_at desc);

create table if not exists radar_snapshots (
  id serial primary key,
  scanned_at timestamptz not null,
  symbol text not null,
  price double precision not null,
  oi double precision,
  oi_usd double precision,
  turnover_usd double precision,
  change24h double precision,
  bid_size double precision,
  ask_size double precision,
  state text,
  bias text,
  score integer
);
create index if not exists radar_snapshots_symbol_scanned_idx
  on radar_snapshots (symbol, scanned_at desc);
create index if not exists radar_snapshots_scanned_idx
  on radar_snapshots (scanned_at desc);

create table if not exists radar_scan_meta (
  id integer primary key,
  venue text not null,
  scanned_at timestamptz not null,
  universe integer not null default 0,
  payload jsonb not null default '{}'::jsonb
);
