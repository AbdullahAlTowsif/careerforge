"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Target,
  BookOpen,
  Sparkles,
  Pencil,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillTag } from "@/components/shared/SkillTag";
import { JobCard } from "@/components/modules/jobs/JobCard";
import { DashboardCharts } from "@/components/modules/dashboard/DashboardCharts";
import { serverFetch } from "@/lib/serverFetch";
import { toast } from "sonner";
import type { DashboardData } from "@/types/dashboard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    serverFetch<DashboardData>("/dashboard")
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) toast.error("Failed to load your dashboard. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading your dashboard...</p>;
  }

  if (!data) return null;

  const { profile, recommendedJobs, recommendedResources, stats } = data;
  const hasSkills = profile.skillsCount > 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back, {profile.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {profile.track
            ? `${profile.track} · ${profile.experienceLevel ?? "N/A"}`
            : "Complete your profile to get personalized recommendations"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.totalJobs}</p>
              <p className="text-xs text-muted-foreground">Available positions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/10">
              <Target className="size-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.averageMatchScore}%</p>
              <p className="text-xs text-muted-foreground">Avg match score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <BookOpen className="size-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.totalResources}</p>
              <p className="text-xs text-muted-foreground">Learning resources</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Profile Summary</CardTitle>
            <CardDescription>Your career profile at a glance</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{profile.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Track</p>
                <p className="text-sm font-medium">{profile.track ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="text-sm font-medium">
                  {profile.experienceLevel ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Education</p>
                <p className="text-sm font-medium">
                  {profile.educationLevel ?? "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Top Skills ({profile.skillsCount})
              </p>
              {hasSkills ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.topSkills.map((skill) => (
                    <SkillTag key={skill} skill={skill} />
                  ))}
                  {profile.skillsCount > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.skillsCount - 8}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No skills added yet.
                  <br />
                  <Button asChild variant="link" size="sm" className="mt-1 px-0">
                    <Link href="/profile">Add skills</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Jobs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            <h2 className="text-lg font-semibold">Recommended for You</h2>
          </div>
          {recommendedJobs.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">View all →</Link>
            </Button>
          )}
        </div>
        {recommendedJobs.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedJobs.map((match) => (
              <JobCard
                key={match.job._id}
                job={match.job}
                matchScore={match.score}
                matchedSkills={match.matchedSkills}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Add skills to your profile to see personalized job
                recommendations.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Recommended Resources */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Learning Recommendations</h2>
          </div>
          {recommendedResources.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/resources">View all →</Link>
            </Button>
          )}
        </div>
        {recommendedResources.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedResources.map((rec) => (
              <Card
                key={rec.resource._id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">
                    {rec.resource.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {rec.resource.platform}
                    <span className="mx-1">&middot;</span>
                    <Badge
                      variant={
                        rec.resource.cost === "Free" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {rec.resource.cost}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Covers your skill gaps:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {rec.matchedGaps.map((gap) => (
                      <SkillTag key={gap} skill={gap} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <BookOpen className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Complete your profile to see learning recommendations.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Charts */}
      <DashboardCharts
        recommendedJobs={recommendedJobs}
        stats={stats}
        skills={profile.topSkills}
      />
    </div>
  );
}
