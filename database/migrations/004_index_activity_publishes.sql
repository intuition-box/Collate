CREATE INDEX IF NOT EXISTS collate_activity_publishes_order_idx
  ON collate_activity_transactions (block_timestamp DESC, id DESC)
  WHERE status = 'confirmed' AND block_timestamp IS NOT NULL AND tx_hash IS NOT NULL;
