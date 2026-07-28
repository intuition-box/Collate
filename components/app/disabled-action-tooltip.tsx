'use client';

import { useId, type ReactNode } from 'react';

export function DisabledActionTooltip({
  reason,
  children,
}: {
  reason: string | null;
  children: ReactNode;
}) {
  const tooltipId = useId();

  return (
    <span
      className="group relative inline-flex"
      tabIndex={reason ? 0 : undefined}
      aria-describedby={reason ? tooltipId : undefined}
    >
      {children}
      {reason ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-xl border border-line bg-white p-3 text-left text-[0.72rem] leading-5 text-muted group-hover:block group-focus-visible:block"
        >
          {reason}
        </span>
      ) : null}
    </span>
  );
}
