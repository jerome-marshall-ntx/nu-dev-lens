"use client";

import { SearchEmptyState } from "@/components/ui/empty-state";
import type { RepositoryWithStats } from "@/data-access/repository";
import {
  Activity,
  ArrowDownAZ,
  GitCommitHorizontal,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { RepositoriesSearch } from "./RepositoriesSearch";
import { RepositoryCard } from "./RepositoryCard";

type SortOption = "commits" | "contributors" | "name" | "activity";
type ActivityFilter = "all" | "active" | "recent" | "inactive";

interface RepositoriesGridProps {
  repositories: RepositoryWithStats[];
}

/**
 * Get activity level based on last activity date.
 */
function getActivityLevel(
  lastActivity: Date | null,
): "active" | "recent" | "inactive" {
  if (!lastActivity) return "inactive";

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 30) return "active";
  if (diffDays <= 90) return "recent";
  return "inactive";
}

export function RepositoriesGrid({ repositories }: RepositoriesGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("commits");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const filteredRepositories = useMemo(() => {
    let result = [...repositories];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (repository) =>
          repository.name.toLowerCase().includes(query) ||
          repository.description?.toLowerCase().includes(query),
      );
    }

    // Filter by activity level
    if (activityFilter !== "all") {
      result = result.filter((repo) => {
        const level = getActivityLevel(repo.lastActivity);
        return level === activityFilter;
      });
    }

    // Sort
    switch (sortBy) {
      case "commits":
        result.sort((a, b) => b.commitCount - a.commitCount);
        break;
      case "contributors":
        result.sort((a, b) => b.contributorCount - a.contributorCount);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "activity":
        result.sort((a, b) => {
          const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          return bTime - aTime;
        });
        break;
    }

    return result;
  }, [repositories, searchQuery, sortBy, activityFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setActivityFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() || activityFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Search */}
      <RepositoriesSearch
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={filteredRepositories.length}
        totalCount={repositories.length}
      />

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Activity Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Activity:</span>
          <div className="flex gap-2">
            <FilterButton
              active={activityFilter === "all"}
              onClick={() => setActivityFilter("all")}
              label="All"
            />
            <FilterButton
              active={activityFilter === "active"}
              onClick={() => setActivityFilter("active")}
              label="Active"
            />
            <FilterButton
              active={activityFilter === "recent"}
              onClick={() => setActivityFilter("recent")}
              label="Recent"
            />
            <FilterButton
              active={activityFilter === "inactive"}
              onClick={() => setActivityFilter("inactive")}
              label="Inactive"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <div className="flex gap-2">
            <SortButton
              active={sortBy === "commits"}
              onClick={() => setSortBy("commits")}
              icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}
              label="Commits"
            />
            <SortButton
              active={sortBy === "contributors"}
              onClick={() => setSortBy("contributors")}
              icon={<Users className="h-3.5 w-3.5" />}
              label="Contributors"
            />
            <SortButton
              active={sortBy === "activity"}
              onClick={() => setSortBy("activity")}
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Recent"
            />
            <SortButton
              active={sortBy === "name"}
              onClick={() => setSortBy("name")}
              icon={<ArrowDownAZ className="h-3.5 w-3.5" />}
              label="Name"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredRepositories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRepositories.map((repository) => (
            <RepositoryCard key={repository.id} repository={repository} />
          ))}
        </div>
      ) : (
        <SearchEmptyState
          query={searchQuery || activityFilter}
          onClear={hasActiveFilters ? clearFilters : undefined}
        />
      )}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground/85 hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  indicator,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  indicator?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground/85 hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {indicator && <span className={`h-2 w-2 rounded-full ${indicator}`} />}
      {label}
    </button>
  );
}
