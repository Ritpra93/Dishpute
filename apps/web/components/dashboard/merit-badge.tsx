import { cn } from "@/lib/utils";

export function MeritBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-high-bg text-merit-high-fg")}>
        High merit
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-mid-bg text-merit-mid-fg")}>
        Mid merit
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-low-bg text-merit-low-fg")}>
      Low merit
    </span>
  );
}
