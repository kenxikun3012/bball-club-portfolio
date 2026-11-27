import type { Stat } from "@/lib/content";

export function Ticker({
  stats,
  founded,
  homeCourt,
}: {
  stats: Stat[];
  founded: number;
  homeCourt: string;
}) {
  const items = [`Est. ${founded}`, ...stats.map((stat) => `${stat.value} ${stat.label}`), homeCourt];
  return (
    <div
      aria-hidden="true"
      className="group relative overflow-hidden border-y border-secondary/60 bg-secondary-wash py-4"
    >
      <div className="marquee flex w-max group-hover:[animation-play-state:paused] items-center gap-8 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8">
            {items.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-8 type-label text-ink-soft"
              >
                {item}
                <span className="inline-block h-2 w-2 rounded-full bg-accent/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
