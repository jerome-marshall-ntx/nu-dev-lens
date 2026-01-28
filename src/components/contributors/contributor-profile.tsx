import {
  ExpertiseTag,
  ExpertiseTagGroup,
} from "@/components/ui/expertise-tag";
import type { ContributorDetails } from "@/data-access/contributor";
import { extractExpertiseTags } from "@/lib/expertise-utils";
import { formatMonthYear } from "@/lib/utils";
import {
  Calendar,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
} from "lucide-react";
import Image from "next/image";

interface ContributorProfileProps {
  contributor: ContributorDetails;
}

export function ContributorProfile({ contributor }: ContributorProfileProps) {
  // Extract expertise tags from summary
  const expertiseTags = extractExpertiseTags(contributor.summary, 8);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      {/* Avatar */}
      <Image
        src={contributor.avatarUrl}
        alt={`${contributor.username}'s avatar`}
        width={120}
        height={120}
        className="shrink-0 rounded-full ring-4 ring-primary/10"
      />

      {/* Info */}
      <div className="flex flex-col items-center gap-4 sm:items-start">
        {/* Name and GitHub Link */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {contributor.username}
            </h1>
            <a
              href={contributor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </a>
          </div>
          {/* Member Since */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Member since {formatMonthYear(contributor.createdAt)}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-chart-1/10 px-4 py-2">
            <FolderGit2 className="h-5 w-5 text-chart-1" />
            <div>
              <p className="text-2xl font-bold text-chart-1">
                {contributor.repositoryCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {contributor.repositoryCount === 1
                  ? "Repository"
                  : "Repositories"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-chart-3/10 px-4 py-2">
            <GitCommitHorizontal className="h-5 w-5 text-chart-3" />
            <div>
              <p className="text-2xl font-bold text-chart-3">
                {contributor.commitCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {contributor.commitCount === 1 ? "Commit" : "Commits"}
              </p>
            </div>
          </div>
        </div>

        {/* Expertise Tags */}
        {expertiseTags.length > 0 && (
          <div className="mt-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Expertise
            </p>
            <ExpertiseTagGroup>
              {expertiseTags.map((tag) => (
                <ExpertiseTag key={tag} label={tag} variant="filled" />
              ))}
            </ExpertiseTagGroup>
          </div>
        )}
      </div>
    </div>
  );
}
