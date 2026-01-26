import {
  KeyContributors,
  RepositoryActivity,
  RepositoryHeader,
  RepositorySummary,
} from "@/components/repositories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getRepositoryById,
  getRepositoryKeyContributors,
  getRepositoryRecentCommits,
  type RepositoryCommit,
  type RepositoryContributor,
} from "@/data-access/repository";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface RepositoryDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RepositoryDetailsPage({
  params,
}: RepositoryDetailsPageProps) {
  const { id } = await params;
  const repositoryId = parseInt(id, 10);

  // Validate ID
  if (isNaN(repositoryId)) {
    notFound();
  }

  // Fetch repository details with error handling
  let repository;
  try {
    repository = await getRepositoryById(repositoryId);
  } catch (error) {
    console.error("Error fetching repository:", error);
    return (
      <div className="space-y-8">
        <Link
          href="/repositories"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Repositories
        </Link>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load repository data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repository) {
    notFound();
  }

  // Fetch related data in parallel with error handling
  let commits: RepositoryCommit[] = [];
  let contributors: RepositoryContributor[] = [];

  try {
    [commits, contributors] = await Promise.all([
      getRepositoryRecentCommits(repository.id, 10),
      getRepositoryKeyContributors(repository.id, 6),
    ]);
  } catch (error) {
    console.error("Error fetching repository data:", error);
    // Continue with empty arrays - the components handle empty states gracefully
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/repositories"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Repositories
      </Link>

      {/* Repository Header */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
        <RepositoryHeader repository={repository} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <RepositorySummary description={repository.description} />
          <KeyContributors contributors={contributors} />
        </div>

        {/* Right Column */}
        <div>
          <RepositoryActivity commits={commits} />
        </div>
      </div>
    </div>
  );
}
