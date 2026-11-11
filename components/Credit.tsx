import { cn } from "@/lib/cn";

/** "by JStudio11 Systems" — links to the developer's site. */
export function Credit({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <a
      href="https://jstudio11sys.github.io/"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1 text-xs text-muted transition-colors hover:text-ink",
        className,
      )}
      title="JStudio11 Systems"
    >
      {compact ? (
        <span className="font-semibold">JS11</span>
      ) : (
        <>
          by <span className="font-semibold">JStudio11 Systems</span>
        </>
      )}
    </a>
  );
}
