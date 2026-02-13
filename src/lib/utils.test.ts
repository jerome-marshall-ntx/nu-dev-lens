import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cn,
  formatMonthYear,
  formatRelativeTime,
  formatShortDate,
} from "@/lib/utils";

describe("cn", () => {
  it("merges Tailwind class conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles mixed class inputs", () => {
    expect(cn("text-sm", { hidden: false, block: true }, ["font-bold"])).toBe(
      "text-sm block font-bold"
    );
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for less than one minute", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 11, 59, 45))).toBe(
      "just now"
    );
  });

  it("formats singular minutes correctly", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 11, 59, 0))).toBe(
      "1 minute ago"
    );
  });

  it("formats plural hours correctly", () => {
    expect(formatRelativeTime(new Date(2026, 0, 1, 7, 0, 0))).toBe(
      "5 hours ago"
    );
  });

  it("formats plural months correctly", () => {
    expect(formatRelativeTime(new Date(2025, 10, 2, 12, 0, 0))).toBe(
      "2 months ago"
    );
  });

  it("formats years correctly", () => {
    expect(formatRelativeTime(new Date(2024, 0, 1, 12, 0, 0))).toBe(
      "2 years ago"
    );
  });
});

describe("date display formatting", () => {
  it("formats month and year from date and string input", () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    const iso = date.toISOString();

    expect(formatMonthYear(date)).toBe("January 2024");
    expect(formatMonthYear(iso)).toBe(formatMonthYear(date));
  });

  it("formats short date from date and string input", () => {
    const date = new Date(2024, 0, 15, 12, 0, 0);
    const iso = date.toISOString();

    expect(formatShortDate(date)).toBe("Jan 15, 2024");
    expect(formatShortDate(iso)).toBe(formatShortDate(date));
  });
});
