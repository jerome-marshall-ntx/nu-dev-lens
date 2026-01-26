import type { searchContributorsByQuery } from "@/use-cases/contributor";
import type { UIMessage } from "ai";

export type OurMessage = UIMessage<
  never,
  {
    commitSummaries: Awaited<ReturnType<typeof searchContributorsByQuery>>;
    action: {
      type: `${'start' | 'stop'}-${'query-rewrite'}`;
      title: string;
    }
  }
>;