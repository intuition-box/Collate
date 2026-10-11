'use client';

import { useQuery } from '@tanstack/react-query';

import { DEFAULT_ADMIN_SETTINGS, resolveCreationLimits } from '@/lib/settings/creation-limits';
import type { CreationLimitsResponse } from '@/types/settings';

export function useCreationLimits(address?: string) {
  const query = useQuery({
    queryKey: ['creation-limits', address?.toLowerCase() ?? null],
    queryFn: async () => {
      const response = await fetch(`/api/settings/creation-limits${address ? `?address=${encodeURIComponent(address)}` : ''}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Batch limits could not be loaded.');
      return (await response.json()) as CreationLimitsResponse;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  return { ...query, limits: query.data?.limits ?? resolveCreationLimits(DEFAULT_ADMIN_SETTINGS) };
}
