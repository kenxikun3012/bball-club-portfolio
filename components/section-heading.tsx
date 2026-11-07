import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  id?: string;
  className?: string;
  tone?: "light" | "dark";
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  intro,
  id,
  className,
  tone = "light",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "grid gap-8 md:grid-cols-12 md:items-end",
        className,
      )}
    >
      <div className="md:col-span-7">
        <div
          className={cn(
            "flex items-center gap-4 type-label",
            dark ? "text-accent-soft" : "text-accent",
          )}
        >
          <span>{index}</span>
          <span aria-hidden="true" className="h-px w-8 bg-secondary" />
          <span>{eyebrow}</span>
        </div>
        <h2
          id={id}
          className={cn(
            "mt-8 type-h2 text-balance",
            dark ? "text-cream-100" : "text-ink",
          )}
        >
          {title}
        </h2>
      </div>
      {intro ? (
        <p
          className={cn(
            "type-lead max-w-md text-pretty md:col-span-4 md:col-start-9 md:justify-self-end",
            dark ? "text-cream-300/85" : "text-ink-soft",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
