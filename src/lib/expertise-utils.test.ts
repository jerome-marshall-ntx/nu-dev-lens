import { describe, expect, it } from "vitest";

import {
  extractAvailableCategories,
  extractCategoriesFromSummary,
  extractExpertiseTags,
  filterByCategory,
  filterByExpertise,
  hasCategory,
  hasExpertise,
  mapTagToCategory,
} from "@/lib/expertise-utils";

describe("extractExpertiseTags", () => {
  it("returns empty array for empty summary", () => {
    expect(extractExpertiseTags(null)).toEqual([]);
    expect(extractExpertiseTags(undefined)).toEqual([]);
  });

  it("extracts bolded expertise terms", () => {
    const summary = "Shipped features using **React** and **TypeScript**.";
    const tags = extractExpertiseTags(summary);

    expect(tags).toEqual(expect.arrayContaining(["React", "TypeScript"]));
  });

  it("extracts from explicit expertise section", () => {
    const summary = "Contributor profile\nExpertise: GraphQL, Redis, AWS";
    const tags = extractExpertiseTags(summary);

    expect(tags).toEqual(expect.arrayContaining(["GraphQL", "Redis", "AWS"]));
  });

  it("falls back to keyword matching and respects maxTags", () => {
    const summary =
      "Built APIs in Node.js with PostgreSQL and Docker, plus CI/CD pipelines.";
    const tags = extractExpertiseTags(summary, 3);

    expect(tags.length).toBe(3);
    expect(tags).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL"]));
  });
});

describe("mapTagToCategory", () => {
  it("maps tags to the expected category", () => {
    expect(mapTagToCategory("React")).toBe("Frontend");
    expect(mapTagToCategory("AWS Lambda")).toBe("Cloud & Infrastructure");
  });

  it("returns null when category is unknown", () => {
    expect(mapTagToCategory("Figma")).toBeNull();
  });
});

describe("category extraction", () => {
  it("extracts categories from summary content", () => {
    const summary =
      "Built **React** dashboards, optimized PostgreSQL queries, and improved DevOps pipelines.";
    const categories = extractCategoriesFromSummary(summary);

    expect(categories).toEqual(
      expect.arrayContaining(["Frontend", "Data & Databases", "DevOps"])
    );
  });

  it("builds available categories sorted by frequency", () => {
    const summaries = [
      "Worked on React and TypeScript frontend apps.",
      "Built React components and improved UI consistency.",
      "Optimized PostgreSQL and SQL performance.",
      "Deployed on AWS and improved cloud reliability.",
    ];

    const categories = extractAvailableCategories(summaries);

    expect(categories[0]).toBe("Frontend");
    expect(categories).toEqual(
      expect.arrayContaining([
        "Frontend",
        "Data & Databases",
        "Cloud & Infrastructure",
      ])
    );
  });
});

describe("matching and filtering helpers", () => {
  it("checks expertise by known pattern and fallback text search", () => {
    expect(hasExpertise("Built React dashboards", "React")).toBe(true);
    expect(hasExpertise("Built design systems", "Design Systems")).toBe(true);
    expect(hasExpertise("Built React dashboards", "GraphQL")).toBe(false);
  });

  it("checks category membership from summary", () => {
    const summary = "Shipped Next.js frontend features and component updates.";
    expect(hasCategory(summary, "Frontend")).toBe(true);
    expect(hasCategory(summary, "Security")).toBe(false);
  });

  it("filters contributors using OR logic for tags and categories", () => {
    const contributors = [
      { id: 1, summary: "Built React and Next.js features." },
      { id: 2, summary: "Managed PostgreSQL and Redis data pipelines." },
      { id: 3, summary: "Focused on IAM and authentication security." },
      { id: 4, summary: null },
    ];

    expect(
      filterByExpertise(contributors, ["React", "Redis"]).map((c) => c.id)
    ).toEqual([1, 2]);

    expect(
      filterByCategory(contributors, ["Frontend", "Security"]).map((c) => c.id)
    ).toEqual([1, 3]);

    expect(filterByExpertise(contributors, [])).toEqual(contributors);
    expect(filterByCategory(contributors, [])).toEqual(contributors);
  });
});
