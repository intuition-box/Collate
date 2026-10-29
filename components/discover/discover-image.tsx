'use client';

import { useEffect, useState } from 'react';

import { getImagePreviewCandidates } from '@/lib/intuition/images';

export function DiscoverImage({ image, label, className = '' }: { image: string | null; label: string; className?: string }) {
  const candidates = getImagePreviewCandidates(image);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [image]);

  if (candidateIndex >= candidates.length) {
    return (
      <div className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-paper via-paper to-accentSoft/75 ${className}`} aria-hidden="true">
        <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-20 w-20 text-ink/30">
          <rect x="25" y="25" width="52" height="52" rx="5" />
          <rect x="18" y="18" width="52" height="52" rx="5" />
          <rect x="11" y="11" width="52" height="52" rx="5" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={candidates[candidateIndex]}
      alt={label}
      loading="lazy"
      onError={() => setCandidateIndex((index) => index + 1)}
      className={`bg-paper object-cover ${className}`}
    />
  );
}
