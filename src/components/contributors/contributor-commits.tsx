import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorCommit } from "@/data-access/contributor";
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
            Showing {commits.length} commits
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {commits.map((commit) => (
            <div
              key={commit.id}
              className="group flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              {/* Commit Icon */}
              <div className="mt-0.5 shrink-0 rounded-full bg-chart-5/10 p-1.5">
                <GitCommitHorizontal className="h-4 w-4 text-chart-5" />
              </div>

              {/* Commit Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Commit message from rawData */}
                    <p className="line-clamp-2 text-sm font-medium">
                      {commit.rawData?.commit?.message?.split("\n")[0] ||
                        "No commit message"}
                    </p>

                    {/* Repository name */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      in{" "}
                      <span className="font-medium">
                        {commit.repository.name}
                      </span>
                    </p>
                  </div>

                  {/* External link */}
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                    aria-label="View commit on GitHub"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* AI Summary if available */}
                {commit.summary && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {commit.summary}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
