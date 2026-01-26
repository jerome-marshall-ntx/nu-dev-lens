"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface RepositoriesSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

export function RepositoriesSearch({
  value,
  onChange,
  resultCount,
  totalCount,
  className,
}: RepositoriesSearchProps) {
  const isFiltered = value.trim().length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search repositories by name or description..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isFiltered ? (
            <>
              Showing {resultCount} of {totalCount}{" "}
              {totalCount === 1 ? "repository" : "repositories"}
            </>
          ) : (
            <>
              {totalCount} {totalCount === 1 ? "repository" : "repositories"}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
