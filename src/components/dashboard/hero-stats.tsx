import { getDashboardStats } from "@/data-access/dashboard-stats";
import { Activity, FolderGit2, GitCommitHorizontal, Users } from "lucide-react";

import { StatCard } from "./stat-card";

export async function HeroStats() {
  const stats = await getDashboardStats();

  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Key Metrics</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Repositories"
          value={stats.repositoryCount}
          icon={FolderGit2}
          description="Total repositories scanned"
          iconClassName="text-chart-1"
          href="/repositories"
        />
        <StatCard
          title="Contributors"
          value={stats.contributorCount}
          icon={Users}
          description="Total contributors tracked"
          iconClassName="text-chart-3"
          href="/contributors"
        />
        <StatCard
          title="Commits"
          value={stats.commitCount}
          icon={GitCommitHorizontal}
          description="Total commits analyzed"
          iconClassName="text-chart-5"
        />
      </div>
    </div>
  );
}
