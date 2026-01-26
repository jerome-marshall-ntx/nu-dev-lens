import { getDashboardStats } from "@/data-access/dashboard-stats";
import { Activity, FolderGit2, GitCommitHorizontal, Users } from "lucide-react";

import { StatCard } from "./stat-card";

export async function HeroStats() {
  const stats = await getDashboardStats();

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Key Metrics</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Repositories"
          value={stats.repositoryCount}
          icon={FolderGit2}
          description="Total repositories scanned"
          className="bg-chart-1/10 text-foreground ring-1 ring-chart-1/20"
          iconClassName="bg-chart-1/20 text-chart-1"
        />
        <StatCard
          title="Contributors"
          value={stats.contributorCount}
          icon={Users}
          description="Total contributors tracked"
          className="bg-chart-3/10 text-foreground ring-1 ring-chart-3/20"
          iconClassName="bg-chart-3/20 text-chart-3"
        />
        <StatCard
          title="Commits"
          value={stats.commitCount}
          icon={GitCommitHorizontal}
          description="Total commits analyzed"
          className="bg-chart-5/10 text-foreground ring-1 ring-chart-5/20"
          iconClassName="bg-chart-5/20 text-chart-5"
        />
      </div>
    </div>
  );
}
