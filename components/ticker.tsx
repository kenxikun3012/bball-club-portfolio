import { club } from "@/lib/content";

const items = [
  `Est. ${club.founded}`,
  ...club.stats.map((stat) => `${stat.value} ${stat.label}`),
  "Main Campus Gymnasium",
];

export function Ticker() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y border-secondary/60 bg-secondary-wash py-4"
    >
      <div className="marquee flex w-max items-center gap-8 whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-8">
            {items.map((item) => (
              <span
                key={`${copy}-${item}`}
                className="flex items-center gap-8 type-label text-ink-soft/70"
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
