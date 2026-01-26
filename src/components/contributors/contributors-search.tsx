"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ContributorsSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  className?: string;
}

export function ContributorsSearch({
  value,
  onChange,
  resultCount,
  totalCount,
  className,
}: ContributorsSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
  }, [onChange]);

  const isFiltered = value.trim().length > 0;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search contributors by name or summary..."
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="pl-10 pr-10"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="shrink-0 text-sm text-muted-foreground">
        {isFiltered ? (
          <>
            <span className="font-medium text-foreground">{resultCount}</span>{" "}
            of {totalCount}
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">{totalCount}</span>{" "}
            contributors
          </>
        )}
      </p>
    </div>
  );
}
