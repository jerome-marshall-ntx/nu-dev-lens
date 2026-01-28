import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import type { TopContributor } from "@/data-access/dashboard-stats";
import { FolderGit2, GitCommitHorizontal, Trophy, Users } from "lucide-react";
import Link from "next/link";

interface TopContributorsListProps {
  contributors: TopContributor[];
}

export function TopContributorsList({
  contributors,
}: TopContributorsListProps) {
  if (contributors.length === 0) {
    return <NoDataEmptyState entityType="contributors" />;
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shadow-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Top Contributors</h2>
            <p className="text-xs text-muted-foreground">Most active this month</p>
          </div>
        </div>
        <Link
          href="/contributors"
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {contributors.map((contributor, index) => (
          <Link
            key={contributor.id}
            href={`/contributors/${contributor.username}`}
            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            {/* Rank */}
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {index + 1}
            </div>

            {/* Avatar */}
            <Avatar size="default">
              <AvatarImage
                src={contributor.avatarUrl}
                alt={contributor.username}
              />
              <AvatarFallback>
                {contributor.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground group-hover:text-primary">
                @{contributor.username}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <GitCommitHorizontal className="h-3 w-3" />
                  {contributor.commitCount} commits
                </span>
                <span className="inline-flex items-center gap-1">
                  <FolderGit2 className="h-3 w-3" />
                  {contributor.repositoryCount} repos
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
