import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface RepositorySummaryProps {
  description: string | null;
}

export function RepositorySummary({ description }: RepositorySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Repository Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {description ? (
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : (
          <p className="italic text-muted-foreground/60">
            No description available for this repository.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
