'use client';

import { useEffect, useState } from 'react';

import { getImagePreviewCandidates } from '@/lib/intuition/images';

export function GraphImage({ image, label, large = false, compact = false }: { image: string | null; label: string; large?: boolean; compact?: boolean }) {
  const candidates = getImagePreviewCandidates(image);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [image]);

  const size = large ? 'h-24 w-24 rounded-2xl sm:h-32 sm:w-32' : compact ? 'h-10 w-10 rounded-lg' : 'h-12 w-12 rounded-xl';
  if (candidateIndex >= candidates.length) {
    return (
      <span className={`flex shrink-0 items-center justify-center border border-line bg-paper/70 text-muted ${size}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={large ? 'h-10 w-10' : 'h-5 w-5'}>
          <path d="M4 5.5h16v13H4zM4 15l4.5-4.5 4 4 2.5-2.5 5 5M16.5 9h.01" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={candidates[candidateIndex]}
      alt={label}
      loading="lazy"
      onError={() => setCandidateIndex((index) => index + 1)}
      className={`shrink-0 border border-line bg-paper object-cover ${size}`}
    />
  );
}
