import { HeroStats } from "@/components/dashboard";

export default async function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your development activity and insights
        </p>
      </div>
      <HeroStats />
    </div>
  );
}
