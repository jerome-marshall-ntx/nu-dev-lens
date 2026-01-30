import type { ContributorRepository } from "@/data-access/contributor";
import { ExternalLink, FolderGit2, GitCommitHorizontal } from "lucide-react";
import { Streamdown } from "streamdown";

interface ContributorReposProps {
  repositories: ContributorRepository[];
}

export function ContributorRepos({ repositories }: ContributorReposProps) {
  if (repositories.length === 0) {
    return (
      <div className="glass-layered rounded-[2rem] p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <FolderGit2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Repository Contributions
          </h2>
        </div>
        <p className="text-muted-foreground/60 italic">
          No repository contributions found.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
            <FolderGit2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Repository Contributions
          </h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {repositories.length}{" "}
          {repositories.length === 1 ? "repository" : "repositories"}
        </span>
      </div>
      <div className="space-y-4">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="glass-subtle hover:glass rounded-2xl p-4 transition-all duration-200"
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
                  <p className="mt-1 line-clamp-1 text-sm text-foreground/80">
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
              <div className="mt-3 border-t border-border/30 pt-3">
                <div className="text-sm leading-relaxed text-foreground">
                  <Streamdown>{repo.summary}</Streamdown>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
