import type { RepositoryDetails } from "@/data-access/repository";
import { formatMonthYear } from "@/lib/utils";
import {
  Calendar,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  Users,
} from "lucide-react";

interface RepositoryHeaderProps {
  repository: RepositoryDetails;
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      {/* Repository Icon */}
      <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/10">
        <FolderGit2 className="h-14 w-14 text-primary" />
      </div>

      {/* Info */}
      <div className="flex flex-col items-center gap-4 sm:items-start">
        {/* Name and GitHub Link */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {repository.name}
            </h1>
            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </a>
          </div>
          {/* Created Date */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Added {formatMonthYear(repository.createdAt)}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-chart-1/10 px-4 py-2">
            <Users className="h-5 w-5 text-chart-1" />
            <div>
              <p className="text-2xl font-bold text-chart-1">
                {repository.contributorCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {repository.contributorCount === 1
                  ? "Contributor"
                  : "Contributors"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-chart-3/10 px-4 py-2">
            <GitCommitHorizontal className="h-5 w-5 text-chart-3" />
            <div>
              <p className="text-2xl font-bold text-chart-3">
                {repository.commitCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {repository.commitCount === 1 ? "Commit" : "Commits"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
