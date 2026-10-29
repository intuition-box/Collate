export function RelicBadge() {
  return (
    <span
      role="img"
      aria-label="Relic holder"
      title="Holds a Relic by Intuition"
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-semibold leading-4 text-warningInk"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M5.2 2.5h5.6l2.7 4-5.5 7-5.5-7 2.7-4Z" />
        <path d="M2.5 6.5h11M5.2 2.5l1.5 4L8 13.5l1.3-7 1.5-4" />
      </svg>
      Relic
    </span>
  );
}
