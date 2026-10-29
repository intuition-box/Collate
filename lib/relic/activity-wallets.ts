import type { ActivityPublish, ActivitySummaryResponse } from '@/types/activity';

export function collectActivityWallets(summary: ActivitySummaryResponse | null, publishes: readonly ActivityPublish[]): string[] {
  return [...new Set([
    ...(summary?.leaderboard.map((entry) => entry.wallet.toLowerCase()) ?? []),
    ...publishes.map((publish) => publish.creatorWallet.toLowerCase()),
  ])].sort();
}

export function chunkActivityWallets(addresses: readonly string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < addresses.length; index += size) {
    chunks.push(addresses.slice(index, index + size));
  }
  return chunks;
}
