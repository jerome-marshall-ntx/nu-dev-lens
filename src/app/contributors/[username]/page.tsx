import { ContributorCommits } from "@/components/contributors/contributor-commits";
import { ContributorProfile } from "@/components/contributors/contributor-profile";
import { ContributorRepos } from "@/components/contributors/contributor-repos";
import { ContributorSummary } from "@/components/contributors/contributor-summary";
import {
  getContributorByUsername,
  getContributorCommits,
  getContributorRepositories,
} from "@/data-access/contributor";
import { ArrowLeft } from "lucide-react";
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

  // Fetch contributor details
  const contributor = await getContributorByUsername(decodedUsername);

  if (!contributor) {
    notFound();
  }

  // Fetch related data in parallel
  const [repositories, commits] = await Promise.all([
    getContributorRepositories(contributor.id),
    getContributorCommits(contributor.id, 20),
  ]);

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
      <div className="rounded-xl border border-border bg-card/50 p-6">
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
        <div>
          <ContributorCommits commits={commits} />
        </div>
      </div>
    </div>
  );
}
