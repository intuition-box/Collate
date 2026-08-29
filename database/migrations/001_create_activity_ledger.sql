CREATE TABLE IF NOT EXISTS collate_activity_transactions (
  id UUID PRIMARY KEY,
  network TEXT NOT NULL CHECK (network IN ('mainnet', 'testnet')),
  chain_id INTEGER NOT NULL,
  source_flow TEXT NOT NULL CHECK (
    source_flow IN ('single_atom', 'batch_atoms', 'csv_atoms', 'inline_atom', 'manual_lists', 'csv_lists')
  ),
  item_kind TEXT NOT NULL CHECK (item_kind IN ('atom', 'list_entry', 'claim')),
  operation TEXT NOT NULL CHECK (operation IN ('createAtoms', 'createTriples')),
  expected_item_count INTEGER NOT NULL CHECK (expected_item_count > 0),
  expected_wallet TEXT NOT NULL,
  calldata_hash TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'intent' CHECK (status IN ('intent', 'pending', 'confirmed', 'reverted', 'expired')),
  failure_reason TEXT,
  block_number BIGINT,
  block_timestamp TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS collate_activity_transactions_chain_tx_idx
  ON collate_activity_transactions (chain_id, tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS collate_activity_transactions_status_idx
  ON collate_activity_transactions (status, expires_at);

CREATE TABLE IF NOT EXISTS collate_activity_items (
  id BIGSERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES collate_activity_transactions(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  item_kind TEXT NOT NULL CHECK (item_kind IN ('atom', 'list_entry', 'claim')),
  network TEXT NOT NULL CHECK (network IN ('mainnet', 'testnet')),
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  protocol_id TEXT NOT NULL,
  atom_data TEXT,
  subject_id TEXT,
  predicate_id TEXT,
  object_id TEXT,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (transaction_id, item_index),
  UNIQUE (network, item_kind, protocol_id)
);

CREATE INDEX IF NOT EXISTS collate_activity_items_creator_idx
  ON collate_activity_items (creator_wallet, created_at DESC);

CREATE INDEX IF NOT EXISTS collate_activity_items_kind_idx
  ON collate_activity_items (item_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS collate_activity_items_network_idx
  ON collate_activity_items (network, created_at DESC);
