"use client";

import type { ContributorWithStats } from "@/data-access/contributor";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderGit2, GitCommitHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ContributorCardProps {
  contributor: ContributorWithStats;
  className?: string;
}

export function ContributorCard({
  contributor,
  className,
}: ContributorCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/contributors/${contributor.username}`);
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
        className,
      )}
    >
      {/* Avatar */}
      <Image
        src={contributor.avatarUrl}
        alt={`${contributor.username}'s avatar`}
        width={56}
        height={56}
        className="shrink-0 rounded-full ring-2 ring-primary/10"
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">
            {contributor.username}
          </h3>
          <a
            href={contributor.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalLinkClick}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            aria-label="View on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Summary */}
        {contributor.summary ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {contributor.summary}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground/60">
            No summary available yet
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-1/10 px-2 py-1 text-xs font-medium text-chart-1">
            <FolderGit2 className="h-3.5 w-3.5" />
            {contributor.repositoryCount}{" "}
            {contributor.repositoryCount === 1 ? "repo" : "repos"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-2 py-1 text-xs font-medium text-chart-3">
            <GitCommitHorizontal className="h-3.5 w-3.5" />
            {contributor.commitCount}{" "}
            {contributor.commitCount === 1 ? "commit" : "commits"}
          </span>
        </div>
      </div>
    </div>
  );
}
