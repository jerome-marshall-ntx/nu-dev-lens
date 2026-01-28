"use client";

import {
  ExpertiseTag,
  ExpertiseTagGroup,
} from "@/components/ui/expertise-tag";
import type { ExpertiseCategory } from "@/lib/expertise-utils";
import { cn } from "@/lib/utils";
import { Filter, X } from "lucide-react";

interface ExpertiseFilterProps {
  availableTags: ExpertiseCategory[];
  selectedTags: ExpertiseCategory[];
  onTagsChange: (tags: ExpertiseCategory[]) => void;
  className?: string;
}

export function ExpertiseFilter({
  availableTags,
  selectedTags,
  onTagsChange,
  className,
}: ExpertiseFilterProps) {
  // Show all available tags (max 10, so no need for expansion)
  const visibleTags = availableTags.slice(0, 10);

  const toggleTag = (tag: ExpertiseCategory) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by expertise</span>
          {selectedTags.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedTags.length} selected
            </span>
          )}
        </div>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <ExpertiseTagGroup>
        {visibleTags.map((tag) => (
          <ExpertiseTag
            key={tag}
            label={tag}
            variant="outline"
            selected={selectedTags.includes(tag)}
            onClick={() => toggleTag(tag)}
          />
        ))}
      </ExpertiseTagGroup>
    </div>
  );
}
