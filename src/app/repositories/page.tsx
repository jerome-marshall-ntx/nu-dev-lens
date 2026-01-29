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
      <div className="glass-layered rounded-[2rem] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <FolderGit2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">All Repositories</h2>
        </div>
        <RepositoriesGrid repositories={repositories} />
      </div>
    </div>
  );
}
