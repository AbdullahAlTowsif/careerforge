"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MatchBreakdown } from "@/types/job";

interface MatchBadgeProps {
  score: number;
  breakdown?: MatchBreakdown;
}

function getScoreClasses(score: number): string {
  if (score >= 70)
    return "bg-success text-success-foreground";
  if (score >= 40)
    return "bg-warning text-warning-foreground";
  return "bg-destructive text-white";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong Match";
  if (score >= 40) return "Partial Match";
  return "Low Match";
}

function getBarColor(value: number): string {
  if (value >= 70) return "bg-success";
  if (value >= 40) return "bg-warning";
  return "bg-destructive";
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-background/70">{label}</span>
        <span className="font-medium text-background">{value}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-background/25">
        <div
          className={cn("h-full rounded-full transition-all", getBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function MatchBadge({ score, breakdown }: MatchBadgeProps) {
  const badge = (
    <Badge
      className={cn(
        "shrink-0 text-xs font-semibold cursor-default",
        getScoreClasses(score)
      )}
    >
      {score}%
    </Badge>
  );

  if (!breakdown) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="w-64 space-y-3 border border-border"
        >
          <p className="text-sm font-semibold text-background">
            {getScoreLabel(score)}
          </p>
          <div className="space-y-2.5">
            <BreakdownRow label="Skill Overlap" value={breakdown.skillOverlap} />
            <BreakdownRow
              label="Experience Fit"
              value={breakdown.experienceAlignment}
            />
            <BreakdownRow
              label="Track Alignment"
              value={breakdown.trackAlignment}
            />
          </div>
          <p className="text-[11px] leading-snug text-background/60">
            Weights: Skills 60% · Experience 25% · Track 15%
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}