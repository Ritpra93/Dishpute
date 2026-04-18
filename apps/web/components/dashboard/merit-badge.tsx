import { Badge } from "@/components/ui/badge";

export function MeritBadge({ score }: { score: number }) {
  if (score >= 70) {
    return <Badge variant="money">Strong · {score}</Badge>;
  }
  if (score >= 40) {
    return <Badge variant="warning">Review · {score}</Badge>;
  }
  return <Badge variant="muted">Skip · {score}</Badge>;
}
