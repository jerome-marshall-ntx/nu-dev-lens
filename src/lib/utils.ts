import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as a relative time string (e.g., "2 days ago", "3 months ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const diffInSeconds = Math.floor(
    (now.getTime() - targetDate.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}

/**
 * Format a date as "Month Year" (e.g., "January 2024")
 */
export function formatMonthYear(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date as a short date string (e.g., "Jan 15, 2024")
 */
export function formatShortDate(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
