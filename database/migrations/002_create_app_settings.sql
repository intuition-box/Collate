CREATE TABLE IF NOT EXISTS collate_app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO collate_app_settings (key, value)
VALUES ('show_activity_in_nav', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
