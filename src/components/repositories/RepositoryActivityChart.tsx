"use client";

import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CommitActivity {
  month: string;
  commits: number;
}

interface RepositoryActivityChartProps {
  /** Raw commits data - will be processed client-side */
  commits: { createdAt: Date | string | null }[];
  /** Number of months to display */
  months?: number;
  className?: string;
}

/**
 * Process commits data to get monthly activity.
 */
function processCommitActivity(
  commits: { createdAt: Date | string | null }[],
  months: number = 6
): CommitActivity[] {
  const now = new Date();
  const monthlyData: Map<string, number> = new Map();

  // Initialize all months with 0
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    monthlyData.set(monthKey, 0);
  }

  // Count commits per month
  for (const commit of commits) {
    if (!commit.createdAt) continue;
    const commitDate = new Date(commit.createdAt);
    const monthKey = commitDate.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    if (monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, (monthlyData.get(monthKey) ?? 0) + 1);
    }
  }

  return Array.from(monthlyData.entries()).map(([month, commits]) => ({
    month,
    commits,
  }));
}

export function RepositoryActivityChart({
  commits,
  months = 6,
  className,
}: RepositoryActivityChartProps) {
  // Process commit data on the client
  const data = useMemo(
    () => processCommitActivity(commits, months),
    [commits, months]
  );

  const hasActivity = data.some((d) => d.commits > 0);

  if (!hasActivity) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12",
          className
        )}
      >
        <Activity className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No activity data available
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10 shadow-sm">
          <Activity className="h-4 w-4 text-chart-3" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Repository Activity</h2>
          <p className="text-xs text-muted-foreground">Commits over time</p>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickMargin={8}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: 600,
                marginBottom: "4px",
              }}
              formatter={(value: number) => [
                `${value} commit${value !== 1 ? "s" : ""}`,
                "",
              ]}
            />
            <Bar
              dataKey="commits"
              fill="hsl(var(--chart-3))"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
