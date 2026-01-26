"use client";

import type { RepositoryWithStats } from "@/data-access/repository";
import { useMemo, useState } from "react";

import { RepositoryCard } from "./RepositoryCard";
import { RepositoriesSearch } from "./RepositoriesSearch";

interface RepositoriesGridProps {
  repositories: RepositoryWithStats[];
}

export function RepositoriesGrid({ repositories }: RepositoriesGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRepositories = useMemo(() => {
    if (!searchQuery.trim()) {
      return repositories;
    }

    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repository) =>
        repository.name.toLowerCase().includes(query) ||
        repository.description?.toLowerCase().includes(query)
    );
  }, [repositories, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <RepositoriesSearch
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={filteredRepositories.length}
        totalCount={repositories.length}
      />

      {/* Grid */}
      {filteredRepositories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRepositories.map((repository) => (
            <RepositoryCard key={repository.id} repository={repository} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-muted-foreground">
            No repositories found matching &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
