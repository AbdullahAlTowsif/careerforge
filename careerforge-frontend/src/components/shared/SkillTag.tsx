import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillTagProps {
  skill: string;
  matched?: boolean;
  missing?: boolean;
}

export function SkillTag({ skill, matched, missing }: SkillTagProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-normal",
        matched && "bg-success/10 text-success border-success/30",
        missing && "bg-warning/10 text-warning border-warning/40"
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
      {missing && (
        <svg
          className="size-3 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {skill}
    </Badge>
  );
}