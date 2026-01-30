import type { ContributorCommit } from "@/data-access/contributor";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ExternalLink, GitCommitHorizontal } from "lucide-react";

interface ContributorCommitsProps {
  commits: ContributorCommit[];
}

export function ContributorCommits({ commits }: ContributorCommitsProps) {
  if (commits.length === 0) {
    return (
      <div className="glass-layered rounded-[2rem] p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <GitCommitHorizontal className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Recent Commits
          </h2>
        </div>
        <p className="text-muted-foreground/60 italic">No commits found.</p>
      </div>
    );
  }

  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <GitCommitHorizontal className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Recent Commits
          </h2>
        </div>
        <span className="text-sm text-muted-foreground">
          Last {commits.length} {commits.length === 1 ? "commit" : "commits"}
        </span>
      </div>
      <div>
        {/* Timeline container */}
        <div className="relative">
          {commits.map((commit, index) => {
            const isLast = index === commits.length - 1;

            return (
              <div key={commit.id} className="group relative flex gap-4">
                {/* Timeline line and dot */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div className="glass-subtle group-hover:glass relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors">
                    <GitCommitHorizontal className="h-4 w-4 text-primary" />
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="h-full w-0.5 bg-gradient-to-b from-primary/20 to-border" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                  {/* Time badge */}
                  <span className="glass-subtle mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {formatRelativeTime(commit.createdAt)}
                  </span>

                  {/* Commit card */}
                  <div className="glass-subtle group-hover:glass rounded-2xl p-3 transition-all duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Commit message */}
                        <p className="line-clamp-2 text-sm font-medium">
                          {commit.rawData?.message?.split("\n")[0] ||
                            "No commit message"}
                        </p>

                        {/* Repository name */}
                        <p className="mt-1 text-xs text-muted-foreground">
                          in{" "}
                          <span className="font-medium text-foreground/80">
                            {commit.repository.name}
                          </span>
                        </p>

                        {/* AI Summary if available */}
                        {commit.summary && (
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground/80">
                            {commit.summary}
                          </p>
                        )}
                      </div>

                      {/* External link */}
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label="View commit on GitHub"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
