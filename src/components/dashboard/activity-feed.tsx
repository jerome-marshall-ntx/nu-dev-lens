import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NoDataEmptyState } from "@/components/ui/empty-state";
import type { RecentActivity } from "@/data-access/dashboard-stats";
import { formatDistanceToNow } from "date-fns";
import { Activity, GitCommitHorizontal } from "lucide-react";
import Link from "next/link";

interface ActivityFeedProps {
  activities: RecentActivity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return <NoDataEmptyState entityType="commits" />;
  }

  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <Activity className="h-5 w-5 text-chart-3" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">
              Latest commits across repositories
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  // Get a short summary or use the commit message
  const displayText =
    activity.summary ||
    activity.message ||
    "Commit";

  // Truncate to first sentence or 100 chars
  const truncatedText =
    displayText.length > 100
      ? displayText.slice(0, 100) + "..."
      : displayText;

  const timeAgo = activity.createdAt
    ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })
    : "recently";

  return (
    <div className="group flex items-start gap-3 rounded-2xl p-3 transition-all duration-200 hover:glass-subtle">
      {/* Icon */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl glass-subtle">
        <GitCommitHorizontal className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/contributors/${activity.contributor.username}`}
            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
          >
            <Avatar size="sm">
              <AvatarImage
                src={activity.contributor.avatarUrl}
                alt={activity.contributor.username}
              />
              <AvatarFallback>
                {activity.contributor.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">@{activity.contributor.username}</span>
          </Link>
          <span className="text-xs text-muted-foreground">in</span>
          <Link
            href={`/repositories/${activity.repository.id}`}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {activity.repository.name}
          </Link>
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
          {truncatedText}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground/70">{timeAgo}</p>
      </div>
    </div>
  );
}
