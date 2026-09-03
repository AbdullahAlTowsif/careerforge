"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";

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
import type { Job } from "@/types/job";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    serverFetch<Job>(`/jobs/${id}`)
      .then((data) => {
        if (active) setJob(data);
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

  const hasLinks =
    job.externalLinks.linkedin || job.externalLinks.bdjobs || job.externalLinks.glassdoor;

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
              <strong className="text-foreground">Experience:</strong> {job.experienceLevel}
            </span>
            <span>
              <strong className="text-foreground">Track:</strong> {job.track}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
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
    </div>
  );
}
