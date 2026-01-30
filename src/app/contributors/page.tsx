import { ContributorsGrid } from "@/components/contributors/contributors-grid";
import { getAllContributorsWithStats } from "@/data-access/contributor";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

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
      <div className="glass-layered rounded-[2rem] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            All Contributors
          </h2>
        </div>
        <ContributorsGrid contributors={contributors} />
      </div>
    </div>
  );
}
