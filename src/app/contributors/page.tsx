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
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">All Contributors</h2>
        </div>
        <ContributorsGrid contributors={contributors} />
      </div>
    </div>
  );
}