import { RepositoriesGrid } from "@/components/repositories";
import { getAllRepositoriesWithStats } from "@/data-access/repository";
import { FolderGit2 } from "lucide-react";

export default async function RepositoriesPage() {
  const repositories = await getAllRepositoriesWithStats();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground">
          Browse all repositories and explore their contributors and commit
          history.
        </p>
      </div>

      {/* Repositories Section */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
            <FolderGit2 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">All Repositories</h2>
        </div>
        <RepositoriesGrid repositories={repositories} />
      </div>
    </div>
  );
}
