import type { Hex } from 'viem';

import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type { PublicIntuitionNetwork } from '@/types/api';

export function TransactionExplorerLink({ network, txHash }: { network: PublicIntuitionNetwork; txHash: Hex }) {
  const { explorerUrl } = getIntuitionNetwork(network);

  return (
    <div className="mt-4 rounded-xl border border-line/80 bg-white/75 p-4">
      <p className="text-xs font-medium uppercase tracking-terminal text-muted">Transaction</p>
      <a
        href={`${explorerUrl}/tx/${txHash}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        View transaction on explorer
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M8 5h7v7M15 5l-9 9M13 15H5V7" />
        </svg>
      </a>
    </div>
  );
}
