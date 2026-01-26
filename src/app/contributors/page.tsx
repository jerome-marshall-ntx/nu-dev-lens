import { ContributorsGrid } from "@/components/contributors/contributors-grid";
import { getAllContributorsWithStats } from "@/data-access/contributor";
import { Users } from "lucide-react";

export default async function ContributorsPage() {
  const contributors = await getAllContributorsWithStats();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Contributors</h1>
        <p className="text-muted-foreground">
          Browse and search all contributors across repositories
        </p>
      </div>

      {/* Contributors Section */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">All Contributors</h2>
        </div>

        <ContributorsGrid contributors={contributors} />
      </div>
    </div>
  );
}