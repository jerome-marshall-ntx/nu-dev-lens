"use client";

import type { ContributorWithStats } from "@/data-access/contributor";
import { useCallback, useMemo, useState } from "react";

import { ContributorCard } from "./contributor-card";
import { ContributorsSearch } from "./contributors-search";

interface ContributorsGridProps {
  contributors: ContributorWithStats[];
}

export function ContributorsGrid({ contributors }: ContributorsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const filteredContributors = useMemo(() => {
    if (!searchQuery.trim()) {
      return contributors;
    }

    const query = searchQuery.toLowerCase();
    return contributors.filter(
      (contributor) =>
        contributor.username.toLowerCase().includes(query) ||
        contributor.summary?.toLowerCase().includes(query),
    );
  }, [contributors, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <ContributorsSearch
        value={searchQuery}
        onChange={handleSearchChange}
        resultCount={filteredContributors.length}
        totalCount={contributors.length}
      />

      {/* Grid */}
      {filteredContributors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContributors.map((contributor) => (
            <ContributorCard key={contributor.id} contributor={contributor} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-muted-foreground">
            No contributors found matching &quot;{searchQuery}&quot;
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
