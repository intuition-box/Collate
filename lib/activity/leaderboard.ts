import type { ActivitySummaryResponse } from '@/types/activity';

export function excludeLeaderboardWallets(
  summary: ActivitySummaryResponse,
  excludedWallets: readonly string[],
): ActivitySummaryResponse {
  if (excludedWallets.length === 0) return summary;
  const excluded = new Set(excludedWallets.map((wallet) => wallet.toLowerCase()));
  return {
    ...summary,
    leaderboard: summary.leaderboard.filter((entry) => !excluded.has(entry.wallet.toLowerCase())),
  };
}
