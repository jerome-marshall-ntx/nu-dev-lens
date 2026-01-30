"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, FolderGit2, Search, Users } from "lucide-react";
import * as React from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "search" | "error" | "contributors" | "repositories";
  className?: string;
}

const variantIcons: Record<string, LucideIcon> = {
  default: Search,
  search: Search,
  error: AlertCircle,
  contributors: Users,
  repositories: FolderGit2,
};

const variantStyles: Record<string, string> = {
  default: "border-border",
  search: "border-border",
  error: "border-destructive/50 bg-destructive/5",
  contributors: "border-border",
  repositories: "border-border",
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        variantStyles[variant],
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-12 w-12 items-center justify-center rounded-full",
          variant === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {/* @ts-expect-error - Icon is not a valid JSX element */}
        <Icon className="h-6 w-6" />
      </div>
      <h3
        className={cn(
          "text-lg font-medium",
          variant === "error" ? "text-destructive" : "text-foreground",
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Convenience components for common empty states

interface SearchEmptyStateProps {
  query: string;
  onClear?: () => void;
  className?: string;
}

export function SearchEmptyState({
  query,
  onClear,
  className,
}: SearchEmptyStateProps) {
  return (
    <EmptyState
      variant="search"
      title={`No results found`}
      description={`No matches for "${query}". Try a different search term.`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        )
      }
      className={className}
    />
  );
}

interface NoDataEmptyStateProps {
  entityType: "contributors" | "repositories" | "commits";
  className?: string;
}

export function NoDataEmptyState({
  entityType,
  className,
}: NoDataEmptyStateProps) {
  const config = {
    contributors: {
      variant: "contributors" as const,
      title: "No contributors yet",
      description: "Run the data import to populate contributor profiles.",
    },
    repositories: {
      variant: "repositories" as const,
      title: "No repositories yet",
      description: "Run the data import to populate repository data.",
    },
    commits: {
      variant: "default" as const,
      title: "No commits yet",
      description: "This entity has no commit history available.",
    },
  };

  const { variant, title, description } = config[entityType];

  return (
    <EmptyState
      variant={variant}
      title={title}
      description={description}
      className={className}
    />
  );
}

interface ErrorEmptyStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorEmptyState({
  title = "Something went wrong",
  description = "Unable to load data. Please try again.",
  onRetry,
  className,
}: ErrorEmptyStateProps) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        )
      }
      className={className}
    />
  );
}
