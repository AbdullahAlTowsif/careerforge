"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobCard } from "@/components/JobCard";
import { SkillTag } from "@/components/SkillTag";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { serverFetch } from "@/lib/serverFetch";
import type { Job } from "@/types/job";
import type { MatchResult, ResourceRecommendation } from "@/types/matching";

const TRACKS = [
  "Web Development",
  "App Development",
  "Game Development",
  "Software Engineering",
  "Machine Learning",
  "Data Science",
  "UI UX Design",
  "Marketing",
] as const;

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Freelance"] as const;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [location, setLocation] = useState("");

  const [recommended, setRecommended] = useState<MatchResult[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(false);

  const [recResources, setRecResources] = useState<ResourceRecommendation[]>([]);
  const [resLoading, setResLoading] = useState(true);

  useEffect(() => {
    let active = true;
    serverFetch<Job[]>("/jobs")
      .then((data) => {
        if (active) setJobs(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    serverFetch<MatchResult[]>("/jobs/recommended")
      .then((data) => {
        if (active) setRecommended(data);
      })
      .catch(() => {
        if (active) setRecError(true);
      })
      .finally(() => {
        if (active) setRecLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    serverFetch<ResourceRecommendation[]>("/resources/recommended")
      .then((data) => {
        if (active) setRecResources(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setResLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (track !== "all" && job.track !== track) return false;
      if (type !== "all" && job.type !== type) return false;
      if (location && !job.location.toLowerCase().includes(location.toLowerCase()))
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [jobs, track, type, location, search]);

  const hasRecJobs = !recLoading && !recError && recommended.length > 0;
  const noSkills = !recLoading && !recError && recommended.length === 0;
  const hasRecResources = !resLoading && recResources.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Browse available job opportunities across all tracks.
        </p>
      </div>

      {/* Recommended for You */}
      {hasRecJobs && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            <h2 className="text-lg font-semibold">Recommended for You</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 6).map((match) => (
              <JobCard
                key={match.job._id}
                job={match.job}
                matchScore={match.score}
                matchedSkills={match.matchedSkills}
              />
            ))}
          </div>
        </section>
      )}

      {noSkills && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Add skills to your profile to see personalized recommendations.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommended Resources */}
      {hasRecResources && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Skill-Based Learning Picks</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recResources.slice(0, 6).map((rec) => (
              <Card key={rec.resource._id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-tight">
                    {rec.resource.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {rec.resource.platform}
                    <span className="mx-1">&middot;</span>
                    <Badge
                      variant={rec.resource.cost === "Free" ? "secondary" : "outline"}
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
        </section>
      )}

      {resLoading && (
        <p className="text-sm text-muted-foreground">Loading recommendations...</p>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">All Jobs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Title or company..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Track</Label>
            <Select value={track} onValueChange={setTrack}>
              <SelectTrigger>
                <SelectValue placeholder="All tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tracks</SelectItem>
                {TRACKS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Dhaka, Remote..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* All Jobs */}
      {loading ? (
        <p className="text-muted-foreground">Loading jobs...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No jobs found matching your criteria.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
