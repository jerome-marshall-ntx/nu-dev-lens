import {
  ActivityFeed,
  HeroStats,
  TopContributorsList,
} from "@/components/dashboard";
import {
  getRecentActivity,
  getTopContributors,
} from "@/data-access/dashboard-stats";

export default async function Home() {
  // Fetch data in parallel
  const [topContributors, recentActivity] = await Promise.all([
    getTopContributors(5),
    getRecentActivity(8),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your development activity and insights
        </p>
      </div>

      {/* Stats Section */}
      <HeroStats />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Top Contributors */}
        <TopContributorsList contributors={topContributors} />

        {/* Right Column - Recent Activity */}
        <ActivityFeed activities={recentActivity} />
      </div>
    </div>
  );
}
