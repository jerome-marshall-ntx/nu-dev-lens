import { Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

interface ContributorSummaryProps {
  summary: string | null;
}

export function ContributorSummary({ summary }: ContributorSummaryProps) {
  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">AI Summary</h2>
      </div>
      {summary ? (
        <div className="text-sm leading-relaxed text-foreground/90">
          <Streamdown>{summary}</Streamdown>
        </div>
      ) : (
        <p className="text-muted-foreground/60 italic">
          No AI-generated summary available yet. This contributor&apos;s work
          hasn&apos;t been analyzed.
        </p>
      )}
    </div>
  );
}
