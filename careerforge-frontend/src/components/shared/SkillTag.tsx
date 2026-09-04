import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillTagProps {
  skill: string;
  matched?: boolean;
}

export function SkillTag({ skill, matched }: SkillTagProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-normal",
        matched &&
          "bg-success/10 text-success border-success/30"
      )}
    >
      {matched && (
        <svg
          className="size-3 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {skill}
    </Badge>
  );
}
