"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { serverFetch } from "@/lib/serverFetch";
import { MatchBadge } from "@/components/modules/jobs/MatchBadge";
import { SkillGapSection } from "@/components/modules/jobs/SkillGapSection";
import { SkillTag } from "@/components/shared/SkillTag";
import type { Job, JobMatchResult } from "@/types/job";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      serverFetch<Job>(`/jobs/${id}`),
      serverFetch<JobMatchResult>(`/jobs/${id}/match`).catch(() => null),
    ])
      .then(([jobData, matchData]) => {
        if (active) {
          setJob(jobData);
          setMatchResult(matchData);
        }
      })
      .catch(() => {
        if (active) router.push("/jobs");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, router]);

  if (loading) {
    return <p className="text-muted-foreground">Loading job details...</p>;
  }

  if (!job) return null;

  const matchedSet = new Set(
    matchResult?.matchedSkills.map((s) => s.toLowerCase()) ?? []
  );
  const missingSet = new Set(
    matchResult?.missingSkills.map((s) => s.toLowerCase()) ?? []
  );

  const hasLinks =
    job.externalLinks.linkedin ||
    job.externalLinks.bdjobs ||
    job.externalLinks.glassdoor;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-1"
        onClick={() => router.push("/jobs")}
      >
        <ArrowLeft className="size-4" />
        Back to Jobs
      </Button>

      {matchResult && (
        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <MatchBadge
                score={matchResult.matchPercentage}
                breakdown={matchResult.breakdown}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {matchResult.matchPercentage}% Match
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on skills, experience, and track
                </p>
              </div>
            </div>
            {matchResult.reasons.length > 0 && (
              <ul className="flex-1 space-y-1 sm:text-right">
                {matchResult.reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {matchResult && matchResult.breakdown && (
        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BarChart3 className="size-4 text-secondary" />
              Score Breakdown
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <BreakdownCard
                label="Skill Overlap"
                value={matchResult.breakdown.skillOverlap}
              />
              <BreakdownCard
                label="Experience Fit"
                value={matchResult.breakdown.experienceAlignment}
              />
              <BreakdownCard
                label="Track Alignment"
                value={matchResult.breakdown.trackAlignment}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-base">
                <span>{job.company}</span>
                <span className="text-muted-foreground">&middot;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {job.location}
                </span>
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              {job.type}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">Experience:</strong>{" "}
              {job.experienceLevel}
            </span>
            <span>
              <strong className="text-foreground">Track:</strong> {job.track}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => {
                const lower = skill.toLowerCase();
                const isMatched = matchedSet.has(lower);
                const isMissing = missingSet.has(lower);
                return (
                  <SkillTag
                    key={skill}
                    skill={skill}
                    matched={isMatched}
                    missing={isMissing && !isMatched}
                  />
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Description</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
              {job.description}
            </p>
          </div>

          {hasLinks && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">External Links</h3>
                <div className="flex flex-wrap gap-3">
                  {job.externalLinks.linkedin && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={job.externalLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  {job.externalLinks.bdjobs && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={job.externalLinks.bdjobs}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        BDjobs
                      </a>
                    </Button>
                  )}
                  {job.externalLinks.glassdoor && (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={job.externalLinks.glassdoor}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        Glassdoor
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {matchResult && (
        <SkillGapSection
          missingSkills={matchResult.missingSkills}
          learningLinks={matchResult.learningLinks}
        />
      )}
    </div>
  );
}

function BreakdownCard({ label, value }: { label: string; value: number }) {
  function getBarColor(val: number): string {
    if (val >= 70) return "bg-success";
    if (val >= 40) return "bg-warning";
    return "bg-destructive";
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
