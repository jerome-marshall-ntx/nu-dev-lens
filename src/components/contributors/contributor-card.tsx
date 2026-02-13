import type { ContributorWithStats } from "@/data-access/contributor";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";

interface ContributorCardProps {
  contributor: ContributorWithStats;
  className?: string;
}

export const ContributorCard = memo(function ContributorCard({
  contributor,
  className,
}: ContributorCardProps) {
  return (
    <Link
      href={`/contributors/${contributor.username}`}
      className={cn(
        "group relative flex cursor-pointer items-start gap-4 rounded-3xl p-5 transition-all duration-300",
        "glass-interactive",
        className,
      )}
    >
      {/* Avatar */}
      {contributor.avatarUrl ? (
        <Image
          src={contributor.avatarUrl}
          alt={`${contributor.username}'s avatar`}
          width={56}
          height={56}
          className="shrink-0 rounded-full ring-2 ring-primary/10"
          loading="eager"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-primary/10">
          <User className="h-7 w-7 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">
            {contributor.username}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(contributor.url, "_blank", "noopener,noreferrer");
            }}
            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
            aria-label="View on GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        {/* Summary */}
        {contributor.summary ? (
          <p className="mt-1 line-clamp-2 text-sm text-foreground/80">
            {contributor.summary.replace(/\*\*/g, "")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground/60 italic">
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
    </Link>
  );
});
