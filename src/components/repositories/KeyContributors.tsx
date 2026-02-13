"use client";

import type { RepositoryContributor } from "@/data-access/repository";
import { cn } from "@/lib/utils";
import { ExternalLink, GitCommitHorizontal, User, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface KeyContributorsProps {
  contributors: RepositoryContributor[];
}

export function KeyContributors({ contributors }: KeyContributorsProps) {
  if (contributors.length === 0) {
    return (
      <div className="glass-layered rounded-[2rem] p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <Users className="h-5 w-5 text-chart-1" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Key Contributors</h2>
        </div>
        <p className="italic text-muted-foreground/60">
          No contributors found.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <Users className="h-5 w-5 text-chart-1" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Key Contributors</h2>
            <p className="text-xs text-muted-foreground">
              Top {contributors.length} by commits
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {contributors.map((contributor) => (
          <ContributorTile key={contributor.id} contributor={contributor} />
        ))}
      </div>
    </div>
  );
}

interface ContributorTileProps {
  contributor: RepositoryContributor;
}

function ContributorTile({ contributor }: ContributorTileProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/contributors/${contributor.username}`);
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-all duration-200 glass-subtle hover:glass"
      )}
    >
      {/* Avatar */}
      {contributor.avatarUrl ? (
        <Image
          src={contributor.avatarUrl}
          alt={`${contributor.username}'s avatar`}
          width={40}
          height={40}
          className="shrink-0 rounded-full ring-2 ring-primary/10"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-primary/10">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {contributor.username}
          </span>
          <a
            href={contributor.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExternalLinkClick}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
            aria-label="View on GitHub"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Commit count */}
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <GitCommitHorizontal className="h-3 w-3" />
          <span>
            {contributor.commitCount}{" "}
            {contributor.commitCount === 1 ? "commit" : "commits"}
          </span>
        </div>
      </div>
    </div>
  );
}
