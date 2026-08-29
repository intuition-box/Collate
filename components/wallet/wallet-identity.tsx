'use client';

import type { Address } from 'viem';

import { useEnsProfile } from '@/components/wallet/use-ens-profile';
import { WalletIdentityAvatar } from '@/components/wallet/wallet-identity-avatar';
import { formatAddress } from '@/lib/utils/format';

export function WalletIdentity({
  address,
  href,
  size = 30,
  showAddress = true,
  className = '',
}: {
  address: Address;
  href?: string | undefined;
  size?: number;
  showAddress?: boolean;
  className?: string;
}) {
  const { data: ensProfile } = useEnsProfile(address);
  const label = ensProfile?.name ?? formatAddress(address);
  const content = (
    <>
      <WalletIdentityAvatar address={address} ensImage={ensProfile?.avatar} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{label}</span>
        {ensProfile?.name && showAddress ? (
          <span className="mt-0.5 block truncate font-mono text-[0.68rem] text-muted">{formatAddress(address)}</span>
        ) : null}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={address}
        className={`inline-flex min-w-0 items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <span title={address} className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      {content}
    </span>
  );
}
