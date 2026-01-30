"use client";

import { SearchEmptyState } from "@/components/ui/empty-state";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { ContributorWithStats } from "@/data-access/contributor";
import type { ExpertiseCategory } from "@/lib/expertise-utils";
import {
  extractAvailableCategories,
  filterByCategory,
} from "@/lib/expertise-utils";
import { ArrowDownAZ, ArrowUpDown, GitCommitHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContributorCard } from "./contributor-card";
import { ContributorsSearch } from "./contributors-search";
import { ExpertiseFilter } from "./expertise-filter";

const PAGE_SIZE = 9;

type SortOption = "commits" | "repos" | "name";

interface ContributorsGridProps {
  contributors: ContributorWithStats[];
}

export function ContributorsGrid({ contributors }: ContributorsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    ExpertiseCategory[]
  >([]);
  const [sortBy, setSortBy] = useState<SortOption>("commits");
  const [page, setPage] = useState(1);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Extract available expertise categories from contributors (max 10)
  const availableCategories = useMemo(
    () => extractAvailableCategories(contributors.map((c) => c.summary)),
    [contributors],
  );

  // Filter and sort contributors
  const filteredContributors = useMemo(() => {
    let result = [...contributors];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (contributor) =>
          contributor.username.toLowerCase().includes(query) ||
          contributor.summary?.toLowerCase().includes(query),
      );
    }

    // Filter by expertise categories
    if (selectedCategories.length > 0) {
      result = filterByCategory(result, selectedCategories);
    }

    // Sort
    switch (sortBy) {
      case "commits":
        result.sort((a, b) => b.commitCount - a.commitCount);
        break;
      case "repos":
        result.sort((a, b) => b.repositoryCount - a.repositoryCount);
        break;
      case "name":
        result.sort((a, b) => a.username.localeCompare(b.username));
        break;
    }

    return result;
  }, [contributors, searchQuery, selectedCategories, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContributors.length / PAGE_SIZE),
  );
  const paginatedContributors = useMemo(
    () => filteredContributors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredContributors, page],
  );

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategories, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
  };

  const hasActiveFilters = searchQuery.trim() || selectedCategories.length > 0;

  return (
    <div className="space-y-6">
      {/* Search */}
      <ContributorsSearch
        value={searchQuery}
        onChange={handleSearchChange}
        resultCount={filteredContributors.length}
        totalCount={contributors.length}
      />

      {/* Expertise Filter */}
      {availableCategories.length > 0 && (
        <ExpertiseFilter
          availableTags={availableCategories}
          selectedTags={selectedCategories}
          onTagsChange={setSelectedCategories}
        />
      )}

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <div className="flex gap-3">
            <SortButton
              active={sortBy === "commits"}
              onClick={() => setSortBy("commits")}
              icon={<GitCommitHorizontal className="h-3.5 w-3.5" />}
              label="Commits"
            />
            <SortButton
              active={sortBy === "repos"}
              onClick={() => setSortBy("repos")}
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              label="Repos"
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
      {filteredContributors.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedContributors.map((contributor) => (
              <ContributorCard key={contributor.id} contributor={contributor} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · Showing{" "}
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredContributors.length)} of{" "}
                {filteredContributors.length}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage((p) => p - 1);
                      }}
                      aria-disabled={page <= 1}
                      className={
                        page <= 1 ? "pointer-events-none opacity-50" : undefined
                      }
                    />
                  </PaginationItem>
                  {(() => {
                    const maxVisible = 5;
                    if (totalPages <= maxVisible) {
                      return Array.from(
                        { length: totalPages },
                        (_, i) => i + 1,
                      ).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                            isActive={page === p}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ));
                    }
                    const pages: (number | "ellipsis")[] = [];
                    if (page <= 3) {
                      pages.push(1, 2, 3, "ellipsis", totalPages);
                    } else if (page >= totalPages - 2) {
                      pages.push(
                        1,
                        "ellipsis",
                        totalPages - 2,
                        totalPages - 1,
                        totalPages,
                      );
                    } else {
                      pages.push(
                        1,
                        "ellipsis",
                        page - 1,
                        page,
                        page + 1,
                        "ellipsis",
                        totalPages,
                      );
                    }
                    return pages.map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                            isActive={page === p}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ),
                    );
                  })()}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage((p) => p + 1);
                      }}
                      aria-disabled={page >= totalPages}
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      ) : (
        <SearchEmptyState
          query={searchQuery || selectedCategories.join(", ")}
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
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
