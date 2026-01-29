import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorCommit } from "@/data-access/contributor";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ExternalLink, GitCommitHorizontal } from "lucide-react";

interface ContributorCommitsProps {
  commits: ContributorCommit[];
}

export function ContributorCommits({ commits }: ContributorCommitsProps) {
  if (commits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCommitHorizontal className="h-5 w-5 text-primary" />
            Recent Commits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="italic text-muted-foreground/60">No commits found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCommitHorizontal className="h-5 w-5 text-primary" />
          Recent Commits
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            Last {commits.length} {commits.length === 1 ? "commit" : "commits"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Timeline container */}
        <div className="relative">
          {commits.map((commit, index) => {
            const isLast = index === commits.length - 1;

            return (
              <div key={commit.id} className="group relative flex gap-4">
                {/* Timeline line and dot */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-background transition-colors group-hover:border-primary/50">
                    <GitCommitHorizontal className="h-4 w-4 text-primary" />
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="h-full w-0.5 bg-gradient-to-b from-primary/20 to-border" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 pb-6",
                    isLast && "pb-0"
                  )}
                >
                  {/* Time badge */}
                  <span className="mb-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {formatRelativeTime(commit.createdAt)}
                  </span>

                  {/* Commit card */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 transition-colors group-hover:border-primary/20 group-hover:bg-muted/50">
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
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
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
      </CardContent>
    </Card>
  );
}
