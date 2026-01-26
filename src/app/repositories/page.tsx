import { RepositoriesGrid } from "@/components/repositories";
import { getAllRepositoriesWithStats } from "@/data-access/repository";

export default async function RepositoriesPage() {
  const repositories = await getAllRepositoriesWithStats();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse all repositories and explore their contributors and commit
          history.
        </p>
      </div>

      {/* Repositories Grid */}
      <RepositoriesGrid repositories={repositories} />
    </div>
  );
}
