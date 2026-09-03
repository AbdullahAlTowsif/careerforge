"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { serverFetch } from "@/lib/serverFetch";
import type { LearningResource } from "@/types/resource";

export default function ResourcesPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string>("all");

  useEffect(() => {
    let active = true;
    serverFetch<LearningResource[]>("/resources")
      .then((data) => {
        if (active) setResources(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const allSkills = useMemo(() => {
    const skillSet = new Set<string>();
    for (const r of resources) {
      for (const s of r.relatedSkills) {
        skillSet.add(s);
      }
    }
    return Array.from(skillSet).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    if (selectedSkill === "all") return resources;
    return resources.filter((r) =>
      r.relatedSkills.some(
        (s) => s.toLowerCase() === selectedSkill.toLowerCase()
      )
    );
  }, [resources, selectedSkill]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Learning Resources</h1>
        <p className="text-sm text-muted-foreground">
          Find courses, tutorials, and materials to build your skills.
        </p>
      </div>

      {/* Filter */}
      <div className="grid gap-2 sm:max-w-xs">
        <Label>Filter by skill</Label>
        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
          <SelectTrigger>
            <SelectValue placeholder="All skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skills</SelectItem>
            {allSkills.map((skill) => (
              <SelectItem key={skill} value={skill}>
                {skill}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {loading ? (
        <p className="text-muted-foreground">Loading resources...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">
          No resources found for this skill.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <Card
              key={resource._id}
              className="flex flex-col transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {resource.title}
                  </CardTitle>
                  <Badge
                    variant={resource.cost === "Free" ? "secondary" : "outline"}
                    className="shrink-0"
                  >
                    {resource.cost}
                  </Badge>
                </div>
                <CardDescription>{resource.platform}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 pb-2">
                <div className="flex flex-wrap gap-1">
                  {resource.relatedSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary"
                >
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open resource
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
