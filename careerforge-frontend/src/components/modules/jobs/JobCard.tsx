import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/components/modules/jobs/MatchBadge";
import { SkillTag } from "@/components/shared/SkillTag";
import type { Job } from "@/types/job";

const typeVariant: Record<string, "default" | "secondary" | "outline"> = {
  "Full-time": "default",
  Internship: "secondary",
  "Part-time": "outline",
  Freelance: "outline",
};

interface JobCardProps {
  job: Job;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export function JobCard({ job, matchScore, matchedSkills, missingSkills }: JobCardProps) {
  const matchedSet = new Set(matchedSkills?.map((s) => s.toLowerCase()));
  const missingSet = new Set(missingSkills?.map((s) => s.toLowerCase()));

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            {matchScore !== undefined && <MatchBadge score={matchScore} />}
            <Badge variant={typeVariant[job.type] ?? "outline"}>
              {job.type}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-1 text-sm">
          {job.company}
          <span className="text-muted-foreground">&middot;</span>
          <MapPin className="size-3.5" />
          {job.location}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        <div className="flex flex-wrap gap-1">
          {job.requiredSkills.slice(0, 5).map((skill) => (
            <SkillTag
              key={skill}
              skill={skill}
              matched={matchedSet.size > 0 && matchedSet.has(skill.toLowerCase())}
              missing={
                missingSet.size > 0 && missingSet.has(skill.toLowerCase())
              }
            />
          ))}
          {job.requiredSkills.length > 5 && (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              +{job.requiredSkills.length - 5}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild variant="ghost" size="sm" className="w-full justify-start text-primary">
          <Link href={`/jobs/${job._id}`}>View Details &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
