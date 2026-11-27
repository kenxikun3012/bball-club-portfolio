import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  title: React.ReactNode;
  intro?: React.ReactNode;
  id?: string;
  className?: string;
  tone?: "light" | "dark";
}

/** Section title + optional intro. The heading carries the section on its own. */
export function SectionHeading({
  title,
  intro,
  id,
  className,
  tone = "light",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("grid gap-8 md:grid-cols-12 md:items-end", className)}>
      <h2
        id={id}
        className={cn(
          "type-h2 text-balance md:col-span-7",
          dark ? "text-cream-100" : "text-ink",
        )}
      >
        {title}
      </h2>
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
