'use client';

import { useQuery } from '@tanstack/react-query';

import type { PublicSettingsResponse } from '@/types/settings';

async function fetchPublicSettings(): Promise<PublicSettingsResponse> {
  const response = await fetch('/api/settings/public');
  if (!response.ok) throw new Error('Public settings could not be loaded.');
  return (await response.json()) as PublicSettingsResponse;
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: fetchPublicSettings,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}
