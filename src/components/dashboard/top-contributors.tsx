import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import type { TopContributor } from "@/data-access/dashboard-stats";
import { FolderGit2, GitCommitHorizontal, Trophy } from "lucide-react";
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
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <Trophy className="h-5 w-5 text-chart-1" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Top Contributors</h2>
            <p className="text-xs text-muted-foreground">Most active this month</p>
          </div>
        </div>
        <Link
          href="/contributors"
          className="glass-btn rounded-full px-4 py-1.5 text-sm text-primary transition-all duration-200"
        >
          View all
        </Link>
      </div>

      <div className="space-y-1">
        {contributors.map((contributor, index) => (
          <Link
            key={contributor.id}
            href={`/contributors/${contributor.username}`}
            className="group flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 hover:glass-subtle"
          >
            {/* Rank */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl glass-subtle text-xs font-semibold text-muted-foreground">
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
