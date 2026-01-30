import { FileText } from "lucide-react";
import { Streamdown } from "streamdown";

interface RepositorySummaryProps {
  description: string | null;
}

export function RepositorySummary({ description }: RepositorySummaryProps) {
  return (
    <div className="glass-layered rounded-[2rem] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="glass-icon flex h-10 w-10 items-center justify-center rounded-2xl">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          Repository Summary
        </h2>
      </div>
      {description ? (
        <Streamdown>{description}</Streamdown>
      ) : (
        <p className="text-muted-foreground/60 italic">
          No description available for this repository.
        </p>
      )}
    </div>
  );
}
