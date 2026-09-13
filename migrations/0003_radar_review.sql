-- Manual review marks on unowned signal rows.
alter table radar_events add column if not exists feedback text;
alter table radar_events add column if not exists feedback_at timestamptz;
