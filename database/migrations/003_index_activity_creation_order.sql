CREATE INDEX IF NOT EXISTS collate_activity_items_creation_order_idx
  ON collate_activity_items (created_at DESC, id DESC);
