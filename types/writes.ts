import type { Hex } from 'viem';

export interface WriteResult {
  kind: 'created' | 'skipped' | 'no_write_needed' | 'failed';
  txHash?: Hex;
  createdIds: Hex[];
  skippedIds: Hex[];
  error?: string;
  trackingPending?: boolean;
  trackingUnavailable?: boolean;
}
