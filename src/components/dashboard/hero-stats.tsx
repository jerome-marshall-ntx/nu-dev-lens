import { getDashboardStats } from "@/data-access/dashboard-stats";
import { Activity, FolderGit2, GitCommitHorizontal, Users } from "lucide-react";

import { StatCard } from "./stat-card";

export async function HeroStats() {
  const stats = await getDashboardStats();

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Key Metrics</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Repositories"
          value={stats.repositoryCount}
          icon={FolderGit2}
          description="Total repositories scanned"
          className="bg-chart-1/10 text-foreground ring-1 ring-chart-1/20 shadow-md shadow-chart-1/10"
          iconClassName="bg-chart-1/20 text-chart-1 shadow-sm shadow-chart-1/20"
          href="/repositories"
        />
        <StatCard
          title="Contributors"
          value={stats.contributorCount}
          icon={Users}
          description="Total contributors tracked"
          className="bg-chart-3/10 text-foreground ring-1 ring-chart-3/20 shadow-md shadow-chart-3/10"
          iconClassName="bg-chart-3/20 text-chart-3 shadow-sm shadow-chart-3/20"
          href="/contributors"
        />
        <StatCard
          title="Commits"
          value={stats.commitCount}
          icon={GitCommitHorizontal}
          description="Total commits analyzed"
          className="bg-chart-5/10 text-foreground ring-1 ring-chart-5/20 shadow-md shadow-chart-5/10"
          iconClassName="bg-chart-5/20 text-chart-5 shadow-sm shadow-chart-5/20"
        />
      </div>
    </div>
  );
}
