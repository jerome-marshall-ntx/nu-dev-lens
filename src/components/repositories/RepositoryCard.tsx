"use client";

import type { RepositoryWithStats } from "@/data-access/repository";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderGit2, GitCommitHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

interface RepositoryCardProps {
  repository: RepositoryWithStats;
  className?: string;
}

export function RepositoryCard({ repository, className }: RepositoryCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/repositories/${repository.id}`);
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex cursor-pointer items-start gap-4 rounded-xl bg-card p-5 ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/20",
        className
      )}
    >
      {/* Repository Icon */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/10">
        <FolderGit2 className="h-7 w-7 text-primary" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">
            {repository.name}
          </h3>
          <a
            href={repository.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalLinkClick}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            aria-label="View on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Description */}
        {repository.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {repository.description}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground/60">
            No description available
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-2 py-1 text-xs font-medium text-chart-3">
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            {repository.commitCount}{" "}
            {repository.commitCount === 1 ? "commit" : "commits"}
          </span>
        </div>
      </div>
    </div>
  );
}
