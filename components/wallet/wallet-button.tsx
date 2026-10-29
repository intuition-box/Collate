'use client';

import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

import { useEnsProfile } from '@/components/wallet/use-ens-profile';
import { WalletIdentityAvatar } from '@/components/wallet/wallet-identity-avatar';
import { formatAddress } from '@/lib/utils/format';

export function WalletButton() {
  const { address, status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { data: ensProfile } = useEnsProfile(address);

  if (status === 'connected' && address) {
    return (
      <button
        type="button"
        onClick={openAccountModal ?? undefined}
        title={address}
        aria-label={`Wallet ${ensProfile?.name ?? formatAddress(address)}`}
        className="inline-flex min-w-0 max-w-[8.5rem] items-center gap-2 whitespace-nowrap rounded-full border border-accent/45 bg-accentSoft/70 py-1.5 pl-1.5 pr-3 text-sm text-ink transition-colors duration-150 hover:border-accent hover:bg-accentSoft sm:max-w-[11rem] sm:pr-4"
      >
        <WalletIdentityAvatar address={address} size={28} />
        <span className="truncate">{ensProfile?.name ?? formatAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openConnectModal ?? undefined}
      className="inline-flex whitespace-nowrap rounded-full border border-ink px-4 py-2 text-sm text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
    >
      {status === 'connecting' ? 'Connecting...' : 'Connect wallet'}
    </button>
  );
}
