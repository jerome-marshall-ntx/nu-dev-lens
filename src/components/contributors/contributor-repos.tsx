import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorRepository } from "@/data-access/contributor";
import {
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
} from "lucide-react";

interface ContributorReposProps {
  repositories: ContributorRepository[];
}

export function ContributorRepos({ repositories }: ContributorReposProps) {
  if (repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderGit2 className="h-5 w-5 text-primary" />
            Repository Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="italic text-muted-foreground/60">
            No repository contributions found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderGit2 className="h-5 w-5 text-primary" />
          Repository Contributions
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {repositories.length}{" "}
            {repositories.length === 1 ? "repository" : "repositories"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            {/* Repo Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-semibold">
                    {repo.repository.name}
                  </h4>
                  <a
                    href={repo.repository.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    aria-label="View repository on GitHub"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {repo.repository.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {repo.repository.description}
                  </p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-chart-3/10 px-2 py-1 text-xs font-medium text-chart-3">
                <GitCommitHorizontal className="h-3.5 w-3.5" />
                {repo.commitCount}
              </span>
            </div>

            {/* Work Summary */}
            {repo.summary && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {repo.summary}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
