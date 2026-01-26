import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface ContributorSummaryProps {
  summary: string | null;
}

export function ContributorSummary({ summary }: ContributorSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="italic text-muted-foreground/60">
            No AI-generated summary available yet. This contributor&apos;s work
            hasn&apos;t been analyzed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
