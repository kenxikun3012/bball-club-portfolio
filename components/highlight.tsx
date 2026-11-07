import { cn } from "@/lib/cn";

/**
 * Emphasised text using the gold secondary as a font colour (no background).
 * On light surfaces the darker `secondary-ink` shade keeps it legible.
 */
export function Highlighted({
  text,
  phrase,
  className = "text-secondary-ink",
}: {
  text: string;
  phrase?: string;
  className?: string;
}) {
  if (!phrase) return <>{text}</>;

  const index = text.indexOf(phrase);
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className={cn(className)}>{phrase}</span>
      {text.slice(index + phrase.length)}
    </>
  );
}
