import { cn } from "@/lib/cn";
import { initials } from "@/lib/content";

function CourtArt({ variant = 0, dark = false }: { variant?: number; dark?: boolean }) {
  const shifts = [
    { cx: 300, cy: 210, r: 150, rotate: 0 },
    { cx: 140, cy: 260, r: 170, rotate: 25 },
    { cx: 250, cy: 330, r: 140, rotate: -30 },
  ];
  const s = shifts[variant % shifts.length];

  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "absolute inset-0 h-full w-full",
        dark ? "text-secondary/25" : "text-ink/20",
      )}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        transform={`rotate(${s.rotate} 200 250)`}
        opacity="0.9"
      >
        <circle cx={s.cx} cy={s.cy} r={s.r} />
        <circle cx={s.cx} cy={s.cy} r={s.r * 0.55} />
        <line x1={s.cx - s.r} y1={s.cy} x2={s.cx + s.r} y2={s.cy} />
        <line x1={s.cx} y1={s.cy - s.r} x2={s.cx} y2={s.cy + s.r} />
        <path
          d={`M 0 ${s.cy + s.r * 0.45} L ${s.cx - s.r * 0.7} ${s.cy + s.r * 0.45} L ${s.cx} ${s.cy - s.r * 0.55}`}
        />
        <path d={`M 400 ${s.cy - s.r * 0.35} L ${s.cx + s.r * 0.65} ${s.cy - s.r * 0.35}`} />
        <path
          d={`M 60 500 L 60 ${s.cy + s.r * 0.7} A ${s.r * 0.7} ${s.r * 0.7} 0 0 1 ${60 + s.r * 1.4} ${s.cy + s.r * 0.7}`}
        />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.55"
        transform="translate(48 408) scale(0.9)"
      >
        <circle cx="0" cy="0" r="34" />
        <line x1="-34" y1="0" x2="34" y2="0" />
        <line x1="0" y1="-34" x2="0" y2="34" />
        <path d="M -34 0 A 34 34 0 0 1 34 0" />
        <path d="M -34 0 A 34 34 0 0 0 34 0" />
      </g>
    </svg>
  );
}

interface PhotoProps {
  /** Put a real image path here later, e.g. "/photos/team.jpg". */
  src?: string | null;
  alt?: string;
  /** Small caption shown on placeholder art. */
  label?: string;
  /** Hide the placeholder caption (for small thumbnails). */
  showLabel?: boolean;
  /** Shows big initials on roster placeholders. */
  init?: string;
  /** Placeholder treatment: warm paper or dark court. */
  tone?: "light" | "dark";
  className?: string;
  variant?: number;
  priority?: boolean;
}

/**
 * Photo — renders a real image when `src` is set, otherwise a designed
 * editorial placeholder so the layout always looks finished.
 */
export function Photo({
  src,
  alt = "",
  label,
  showLabel = true,
  init,
  tone = "light",
  className,
  variant = 0,
  priority = false,
}: PhotoProps) {
  const dark = tone === "dark";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        dark ? "bg-[#1a140d]" : "bg-cream-200",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          dark
            ? "bg-[radial-gradient(120%_90%_at_80%_10%,#332817_0%,#1f1810_70%,#14100b_100%)]"
            : "bg-[radial-gradient(120%_90%_at_80%_10%,#f7e7c6_0%,#e8d7b6_70%,#dcc79f_100%)]",
        )}
      />
      <CourtArt variant={variant} dark={dark} />
      <div
        className={cn(
          "absolute inset-0",
          dark
            ? "bg-gradient-to-t from-ink/70 via-transparent to-transparent"
            : "bg-gradient-to-t from-ink/[0.13] via-transparent to-cream-50/30",
        )}
      />
      {init ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center type-stat",
            dark ? "text-secondary/20" : "text-ink/25",
          )}
        >
          {init}
        </span>
      ) : null}
      {showLabel ? (
        <span
          className={cn(
            "absolute bottom-2 left-2 rounded-full px-2 py-2 type-label backdrop-blur-sm",
            dark
              ? "border border-secondary/40 bg-ink/70 text-cream-200/70"
              : "border border-secondary/50 bg-cream-50/85 text-ink/55",
          )}
        >
          {label ?? "Photo placeholder"}
        </span>
      ) : null}
    </div>
  );
}

export function MemberPhoto({
  name,
  label,
  className,
  variant = 0,
  src,
  showLabel = true,
  tone = "light",
}: {
  name: string;
  label?: string;
  className?: string;
  variant?: number;
  src?: string | null;
  showLabel?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <Photo
      src={src}
      init={initials(name)}
      label={label ?? name}
      showLabel={showLabel}
      tone={tone}
      alt={`Portrait of ${name}`}
      variant={variant}
      className={className}
    />
  );
}
