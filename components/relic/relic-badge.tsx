import Image from 'next/image';

export function RelicBadge() {
  return (
    <span
      role="img"
      aria-label="Relicooor, Relic holder"
      title="Holds a Relic by Intuition"
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line/80 bg-white/65 px-1.5 py-0.5 text-xs font-medium leading-4 text-muted"
    >
      <Image src="/relics/common.png" alt="" width={16} height={16} className="h-4 w-4 shrink-0 object-contain" />
      Relicooor
    </span>
  );
}
