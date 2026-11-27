import { cn } from "@/lib/cn";

/**
 * One authored icon set: 16px grid, 1.5 stroke, round caps. Replaces the Unicode
 * arrows that rendered differently in every font.
 */
interface IconProps {
  className?: string;
}

function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function ArrowRight({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </Icon>
  );
}

export function ArrowLeft({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" />
    </Icon>
  );
}

export function ArrowUp({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M8 13.5v-11M3.5 7 8 2.5 12.5 7" />
    </Icon>
  );
}

export function ChevronDown({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </Icon>
  );
}

/** Club mark: a flame inside the ball's seam lines — the "Flames" in YTU-Flames. */
export function FlameMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("shrink-0", className)}>
      <circle cx="20" cy="20" r="20" fill="var(--color-ink)" />
      <g fill="none" stroke="var(--color-cream-100)" strokeOpacity="0.22" strokeWidth="1">
        <path d="M4 20h32M20 4v32" />
        <path d="M8.5 9.5a16 16 0 0 1 0 21M31.5 9.5a16 16 0 0 0 0 21" />
      </g>
      <path
        fill="var(--color-accent-soft)"
        d="M20.4 7.5c1.2 4.3 6.8 7.4 6.8 13.6a7.2 7.2 0 0 1-14.4 0c0-3.3 1.6-5.6 3.5-7.3.1 2.4 1.2 4 2.7 4.5-.9-3.9.1-7.6 1.4-10.8Z"
      />
      <path
        fill="var(--color-secondary)"
        d="M20.2 18.6c.6 2.1 3.2 3.4 3.2 6a3.4 3.4 0 0 1-6.8 0c0-1.5.7-2.6 1.6-3.4.1 1 .6 1.7 1.2 1.9-.3-1.6 0-3.1.8-4.5Z"
      />
    </svg>
  );
}
