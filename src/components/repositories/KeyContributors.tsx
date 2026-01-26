"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RepositoryContributor } from "@/data-access/repository";
import { cn } from "@/lib/utils";
import { ExternalLink, GitCommitHorizontal, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface KeyContributorsProps {
  contributors: RepositoryContributor[];
}

export function KeyContributors({ contributors }: KeyContributorsProps) {
  if (contributors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Key Contributors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="italic text-muted-foreground/60">
            No contributors found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Key Contributors
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            Top {contributors.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {contributors.map((contributor) => (
            <ContributorTile key={contributor.id} contributor={contributor} />
          ))}
        </div>
      </CardContent>
    </Card>
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
        "group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-all hover:border-primary/20 hover:bg-muted/50"
      )}
    >
      {/* Avatar */}
      <Image
        src={contributor.avatarUrl}
        alt={`${contributor.username}'s avatar`}
        width={40}
        height={40}
        className="shrink-0 rounded-full ring-2 ring-primary/10"
      />

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
