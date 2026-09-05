"use client";

import { BookOpen, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningLink } from "@/types/job";

interface SkillGapSectionProps {
  missingSkills: string[];
  learningLinks: LearningLink[];
}

export function SkillGapSection({
  missingSkills,
  learningLinks,
}: SkillGapSectionProps) {
  if (missingSkills.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          You have all the required skills for this job.
        </CardContent>
      </Card>
    );
  }

  const linkMap = new Map(
    learningLinks.map((ll) => [ll.skill.toLowerCase(), ll.resources])
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4 text-secondary" />
          Skills to Develop
          <Badge variant="secondary" className="text-xs">
            {missingSkills.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingSkills.map((skill) => {
          const resources = linkMap.get(skill.toLowerCase()) ?? [];
          return (
            <div key={skill} className="space-y-2">
              <Badge
                variant="outline"
                className="border-warning/40 bg-warning/10 text-xs text-warning"
              >
                {skill}
              </Badge>
              {resources.length > 0 ? (
                <ul className="space-y-1.5 pl-1">
                  {resources.map((r) => (
                    <li
                      key={r._id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <ExternalLink className="size-3 shrink-0" />
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-foreground underline-offset-2 hover:underline"
                      >
                        {r.title}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {r.platform}
                      </span>
                      <Badge
                        variant={r.cost === "Free" ? "secondary" : "outline"}
                        className="ml-auto shrink-0 text-[10px] font-normal"
                      >
                        {r.cost}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pl-1 text-xs text-muted-foreground italic">
                  No resources found yet.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
