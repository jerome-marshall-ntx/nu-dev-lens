"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

interface ExpertiseTagProps {
  label: string;
  variant?: "default" | "outline" | "filled";
  size?: "sm" | "default";
  removable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

const variantStyles = {
  default: "bg-muted text-foreground/70 hover:bg-muted/80",
  outline:
    "border border-border bg-transparent text-foreground/70 hover:bg-muted/50",
  filled: "bg-primary/10 text-primary hover:bg-primary/20",
};

const selectedStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-primary bg-primary/10 text-primary hover:bg-primary/20",
  filled: "bg-primary text-primary-foreground hover:bg-primary/90",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  default: "px-2.5 py-1 text-xs",
};

export function ExpertiseTag({
  label,
  variant = "default",
  size = "default",
  removable = false,
  selected = false,
  onClick,
  onRemove,
  className,
}: ExpertiseTagProps) {
  const isClickable = !!onClick;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <span
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        sizeStyles[size],
        selected ? selectedStyles[variant] : variantStyles[variant],
        isClickable && "cursor-pointer",
        className,
      )}
    >
      {label}
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

interface ExpertiseTagGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ExpertiseTagGroup({
  children,
  className,
}: ExpertiseTagGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>{children}</div>
  );
}
