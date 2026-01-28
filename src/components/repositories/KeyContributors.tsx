"use client";

import {
  ExpertiseTag,
  ExpertiseTagGroup,
} from "@/components/ui/expertise-tag";
import type { RepositoryContributor } from "@/data-access/repository";
import { extractExpertiseTags } from "@/lib/expertise-utils";
import { cn } from "@/lib/utils";
import { ExternalLink, GitCommitHorizontal, User, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface KeyContributorsProps {
  contributors: RepositoryContributor[];
}

export function KeyContributors({ contributors }: KeyContributorsProps) {
  if (contributors.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10 shadow-sm">
            <Users className="h-4 w-4 text-chart-1" />
          </div>
          <h2 className="text-lg font-semibold">Key Contributors</h2>
        </div>
        <p className="italic text-muted-foreground/60">
          No contributors found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10 shadow-sm">
            <Users className="h-4 w-4 text-chart-1" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Key Contributors</h2>
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

  // Extract expertise tags from summary
  const expertiseTags = useMemo(
    () => extractExpertiseTags(contributor.summary, 3),
    [contributor.summary]
  );

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
        "group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card/50 p-3 transition-all hover:border-primary/20 hover:bg-card"
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

        {/* Expertise Tags */}
        {expertiseTags.length > 0 && (
          <ExpertiseTagGroup className="mt-2">
            {expertiseTags.map((tag) => (
              <ExpertiseTag key={tag} label={tag} variant="filled" size="sm" />
            ))}
          </ExpertiseTagGroup>
        )}
      </div>
    </div>
  );
}
