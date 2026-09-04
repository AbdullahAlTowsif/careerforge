"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchResult } from "@/types/matching";
import type { DashboardStats } from "@/types/dashboard";

const CHART_COLORS = {
  success: "#10B981",
  warning: "#F59E0B",
  destructive: "#EF4444",
  primary: "#0D9488",
  muted: "#94A3B8",
} as const;

function scoreColor(score: number): string {
  if (score >= 70) return CHART_COLORS.success;
  if (score >= 40) return CHART_COLORS.warning;
  return CHART_COLORS.destructive;
}

interface DashboardChartsProps {
  recommendedJobs: MatchResult[];
  stats: DashboardStats;
  skills: string[];
}

export function DashboardCharts({
  recommendedJobs,
  stats,
  skills,
}: DashboardChartsProps) {
  const hasJobs = recommendedJobs.length > 0;
  const hasSkills = skills.length > 0;

  const barData = recommendedJobs.map((m) => ({
    name: m.job.title.length > 20 ? m.job.title.slice(0, 18) + "…" : m.job.title,
    score: m.score,
  }));

  const excellent = recommendedJobs.filter((m) => m.score >= 70).length;
  const good = recommendedJobs.filter((m) => m.score >= 40 && m.score < 70).length;
  const low = recommendedJobs.filter((m) => m.score < 40).length;

  const donutData = [
    { name: "Excellent (≥70%)", value: excellent, fill: CHART_COLORS.success },
    { name: "Good (40–69%)", value: good, fill: CHART_COLORS.warning },
    { name: "Low (<40%)", value: low, fill: CHART_COLORS.destructive },
  ].filter((d) => d.value > 0);

  const radarSkills = skills.slice(0, 6);
  const radarData = radarSkills.map((skill) => ({
    skill,
    value: 1,
  }));

  if (!hasJobs && !hasSkills) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Analytics</h2>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar Chart — Match Scores */}
        {hasJobs && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Job Match Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Match"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Donut Chart — Score Distribution */}
        {hasJobs && donutData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Radar Chart — Skill Coverage */}
        {hasSkills && (
          <Card className={hasJobs ? "" : "lg:col-span-3"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your Skill Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                  />
                  <PolarRadiusAxis
                    tick={false}
                    axisLine={false}
                    domain={[0, 1.2]}
                  />
                  <Radar
                    dataKey="value"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary Card */}
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-wrap items-center justify-center gap-6 py-4 text-center text-sm text-muted-foreground">
            <div>
              <span className="block text-lg font-semibold text-foreground">
                {stats.totalJobs}
              </span>
              Total Jobs
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="block text-lg font-semibold text-foreground">
                {stats.totalResources}
              </span>
              Total Resources
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span
                className="block text-lg font-semibold"
                style={{ color: scoreColor(stats.averageMatchScore) }}
              >
                {stats.averageMatchScore}%
              </span>
              Avg Match
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
