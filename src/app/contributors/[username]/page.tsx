import { ActivityChart } from "@/components/contributors/activity-chart";
import { ContributorCommits } from "@/components/contributors/contributor-commits";
import { ContributorProfile } from "@/components/contributors/contributor-profile";
import { ContributorRepos } from "@/components/contributors/contributor-repos";
import { ContributorSummary } from "@/components/contributors/contributor-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getContributorByUsername,
  getContributorCommits,
  getContributorRepositories,
  type ContributorCommit,
  type ContributorRepository,
} from "@/data-access/contributor";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ContributorDetailsPageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function ContributorDetailsPage({
  params,
}: ContributorDetailsPageProps) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  // Fetch contributor details with error handling
  let contributor;
  try {
    contributor = await getContributorByUsername(decodedUsername);
  } catch (error) {
    console.error("Error fetching contributor:", error);
    return (
      <div className="space-y-8">
        <Link
          href="/contributors"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contributors
        </Link>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Contributor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load contributor data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contributor) {
    notFound();
  }

  // Fetch related data in parallel with error handling
  let repositories: ContributorRepository[] = [];
  let commits: ContributorCommit[] = [];
  let allCommitsForChart: ContributorCommit[] = [];

  try {
    [repositories, commits, allCommitsForChart] = await Promise.all([
      getContributorRepositories(contributor.id),
      getContributorCommits(contributor.id, 5),
      // Fetch more commits for the activity chart (last 6 months worth)
      getContributorCommits(contributor.id, 500),
    ]);
  } catch (error) {
    console.error("Error fetching contributor data:", error);
    // Continue with empty arrays - the components handle empty states gracefully
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/contributors"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contributors
      </Link>

      {/* Profile Header */}
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/80 to-muted/30 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
        <ContributorProfile contributor={contributor} />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ContributorSummary summary={contributor.summary} />
          <ContributorRepos repositories={repositories} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ActivityChart commits={allCommitsForChart} months={6} />
          <ContributorCommits commits={commits} />
        </div>
      </div>
    </div>
  );
}
