import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchBadgeProps {
  score: number;
}

function getScoreClasses(score: number): string {
  if (score >= 70)
    return "bg-success text-success-foreground";
  if (score >= 40)
    return "bg-warning text-warning-foreground";
  return "bg-destructive text-white";
}

export function MatchBadge({ score }: MatchBadgeProps) {
  return (
    <Badge
      className={cn(
        "shrink-0 text-xs font-semibold",
        getScoreClasses(score)
      )}
    >
      {score}%
    </Badge>
  );
}
