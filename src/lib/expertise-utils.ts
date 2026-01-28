/**
 * Utility functions for extracting and working with expertise tags from AI summaries.
 */

// Generic expertise categories (max 10)
export const EXPERTISE_CATEGORIES = [
  "Frontend",
  "Backend",
  "Full-stack",
  "DevOps",
  "Testing",
  "Security",
  "Data & Databases",
  "APIs & Integration",
  "UI/UX",
  "Cloud & Infrastructure",
] as const;

export type ExpertiseCategory = (typeof EXPERTISE_CATEGORIES)[number];

// Map specific tags/patterns to generic categories
const CATEGORY_MAPPINGS: Record<ExpertiseCategory, (string | RegExp)[]> = {
  Frontend: [
    "React",
    "ReactJS",
    "Vue",
    "Vue.js",
    "Angular",
    "Next.js",
    "NextJS",
    "JavaScript",
    "JS",
    "TypeScript",
    "TS",
    "CSS",
    "HTML",
    "Redux",
    "Frontend",
    "Front-end",
    "UI",
    "Components",
    "State Management",
  ],
  Backend: [
    "Node.js",
    "NodeJS",
    "Python",
    "Java",
    "Go",
    "Golang",
    "Rust",
    "C++",
    "Ruby",
    "PHP",
    "Backend",
    "Back-end",
  ],
  "Full-stack": ["Full-stack", "Fullstack"],
  DevOps: [
    "DevOps",
    "Docker",
    "Kubernetes",
    "K8s",
    "CI/CD",
    "Microsegmentation",
  ],
  Testing: ["Testing", "Test", "Tests", "Jest", "Cypress"],
  Security: ["Security", "Authentication", "Auth", "OAuth", "JWT", "IAM"],
  "Data & Databases": [
    "PostgreSQL",
    "Postgres",
    "PG",
    "MySQL",
    "MongoDB",
    "Redis",
    "SQL",
  ],
  "APIs & Integration": ["API", "APIs", "REST", "GraphQL"],
  "UI/UX": ["UI", "User Interface", "UX", "User Experience"],
  "Cloud & Infrastructure": [
    "AWS",
    "Azure",
    "GCP",
    "Google Cloud",
    "Prism",
    "Flow",
    "DRaaS",
  ],
};

// Common expertise keywords to look for in summaries
const EXPERTISE_PATTERNS = [
  // Frontend
  { pattern: /\b(React|ReactJS)\b/gi, tag: "React" },
  { pattern: /\b(TypeScript|TS)\b/gi, tag: "TypeScript" },
  { pattern: /\b(JavaScript|JS)\b/gi, tag: "JavaScript" },
  { pattern: /\b(Vue|Vue\.js)\b/gi, tag: "Vue" },
  { pattern: /\b(Angular)\b/gi, tag: "Angular" },
  { pattern: /\b(Next\.js|NextJS)\b/gi, tag: "Next.js" },
  { pattern: /\b(Redux)\b/gi, tag: "Redux" },
  { pattern: /\b(CSS|LESS|SASS|Tailwind)\b/gi, tag: "CSS" },
  { pattern: /\b(HTML)\b/gi, tag: "HTML" },

  // Backend
  { pattern: /\b(Node\.js|NodeJS)\b/gi, tag: "Node.js" },
  { pattern: /\b(Python)\b/gi, tag: "Python" },
  { pattern: /\b(Java)\b/gi, tag: "Java" },
  { pattern: /\b(Go|Golang)\b/gi, tag: "Go" },
  { pattern: /\b(Rust)\b/gi, tag: "Rust" },
  { pattern: /\b(C\+\+)\b/gi, tag: "C++" },
  { pattern: /\b(Ruby)\b/gi, tag: "Ruby" },
  { pattern: /\b(PHP)\b/gi, tag: "PHP" },

  // Databases
  { pattern: /\b(PostgreSQL|Postgres|PG)\b/gi, tag: "PostgreSQL" },
  { pattern: /\b(MySQL)\b/gi, tag: "MySQL" },
  { pattern: /\b(MongoDB)\b/gi, tag: "MongoDB" },
  { pattern: /\b(Redis)\b/gi, tag: "Redis" },
  { pattern: /\b(SQL)\b/gi, tag: "SQL" },

  // DevOps/Infrastructure
  { pattern: /\b(Docker)\b/gi, tag: "Docker" },
  { pattern: /\b(Kubernetes|K8s)\b/gi, tag: "Kubernetes" },
  { pattern: /\b(AWS)\b/gi, tag: "AWS" },
  { pattern: /\b(Azure)\b/gi, tag: "Azure" },
  { pattern: /\b(GCP|Google Cloud)\b/gi, tag: "GCP" },
  { pattern: /\b(CI\/CD)\b/gi, tag: "CI/CD" },

  // Testing
  { pattern: /\b(Jest)\b/gi, tag: "Jest" },
  { pattern: /\b(Testing|Test|Tests)\b/gi, tag: "Testing" },
  { pattern: /\b(Cypress)\b/gi, tag: "Cypress" },

  // Domain areas
  { pattern: /\b(API|APIs|REST|GraphQL)\b/gi, tag: "APIs" },
  { pattern: /\b(Authentication|Auth|OAuth|JWT)\b/gi, tag: "Authentication" },
  { pattern: /\b(Security)\b/gi, tag: "Security" },
  { pattern: /\b(Performance)\b/gi, tag: "Performance" },
  { pattern: /\b(UI|User Interface)\b/gi, tag: "UI" },
  { pattern: /\b(UX|User Experience)\b/gi, tag: "UX" },
  { pattern: /\b(Frontend|Front-end)\b/gi, tag: "Frontend" },
  { pattern: /\b(Backend|Back-end)\b/gi, tag: "Backend" },
  { pattern: /\b(Full-stack|Fullstack)\b/gi, tag: "Full-stack" },
  { pattern: /\b(DevOps)\b/gi, tag: "DevOps" },
  { pattern: /\b(Data Visualization|Visualization)\b/gi, tag: "Visualization" },
  { pattern: /\b(State Management)\b/gi, tag: "State Management" },
  { pattern: /\b(Component|Components)\b/gi, tag: "Components" },

  // Nutanix specific
  { pattern: /\b(Prism)\b/gi, tag: "Prism" },
  { pattern: /\b(Flow)\b/gi, tag: "Flow" },
  { pattern: /\b(DRaaS)\b/gi, tag: "DRaaS" },
  { pattern: /\b(IAM)\b/gi, tag: "IAM" },
  { pattern: /\b(Microsegmentation)\b/gi, tag: "Microsegmentation" },
];

/**
 * Extracts expertise tags from a contributor's summary.
 * Uses multiple strategies:
 * 1. Extracts bolded terms (AI highlights key skills with **bold**)
 * 2. Extracts from "Expertise:" sections if present
 * 3. Falls back to keyword pattern matching
 * 
 * @param summary - The AI-generated summary text
 * @param maxTags - Maximum number of tags to return (default: 5)
 * @returns Array of expertise tags found in the summary
 */
export function extractExpertiseTags(
  summary: string | null | undefined,
  maxTags: number = 5
): string[] {
  if (!summary) return [];

  const foundTags = new Set<string>();

  // Strategy 1: Extract bolded terms (AI highlights key skills with **bold**)
  const boldedTerms = summary.match(/\*\*([^*]+)\*\*/g);
  if (boldedTerms) {
    for (const bolded of boldedTerms) {
      const term = bolded.replace(/\*\*/g, "").trim();
      // Filter out common non-skill words
      if (
        term.length > 2 &&
        !term.match(/^(the|and|or|for|with|from|this|that|these|those)$/i)
      ) {
        foundTags.add(term);
        if (foundTags.size >= maxTags) break;
      }
    }
  }

  // Strategy 2: Extract from "Expertise:" sections
  const expertiseMatch = summary.match(/Expertise:\s*([^\n]+)/i);
  if (expertiseMatch && expertiseMatch[1]) {
    const expertiseList = expertiseMatch[1]
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    for (const tag of expertiseList) {
      foundTags.add(tag);
      if (foundTags.size >= maxTags) break;
    }
  }

  // Strategy 3: Extract from "Primary Activities & Areas of Focus:" sections
  const activitiesMatch = summary.match(
    /\*\*Primary Activities & Areas of Focus:\*\*\s*([\s\S]*?)(?:\n\n|\*\*|$)/i
  );
  if (activitiesMatch && activitiesMatch[1]) {
    const activities = activitiesMatch[1]
      .split(/\n-|\n\*|\n\d+\./)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^[-*•]\s*$/));
    for (const activity of activities.slice(0, 3)) {
      // Extract key terms from activity descriptions
      const words = activity
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !word.match(/^(the|and|or|for|with|from|this|that|building|developing|implementing|improving|fixing|adding|enhancing)$/i)
        );
      if (words.length > 0) {
        // Take the most significant word (usually the last meaningful word)
        const keyTerm = words[words.length - 1];
        if (keyTerm && keyTerm.length > 3) {
          foundTags.add(keyTerm);
          if (foundTags.size >= maxTags) break;
        }
      }
    }
  }

  // Strategy 4: Fallback to keyword pattern matching for common technologies
  if (foundTags.size < maxTags) {
    for (const { pattern, tag } of EXPERTISE_PATTERNS) {
      if (foundTags.has(tag)) continue; // Skip if already found
      if (pattern.test(summary)) {
        foundTags.add(tag);
        pattern.lastIndex = 0; // Reset for global patterns
      }
      if (foundTags.size >= maxTags) break;
    }
  }

  return Array.from(foundTags).slice(0, maxTags);
}

/**
 * Maps a specific tag to its generic category.
 * @param tag - The specific expertise tag
 * @returns The category name or null if no match
 */
export function mapTagToCategory(tag: string): ExpertiseCategory | null {
  const normalizedTag = tag.toLowerCase().trim();

  // First try exact matches (case-insensitive)
  for (const [category, patterns] of Object.entries(CATEGORY_MAPPINGS)) {
    for (const pattern of patterns) {
      if (typeof pattern === "string") {
        const normalizedPattern = pattern.toLowerCase();
        // Exact match or tag contains pattern as whole word
        if (
          normalizedTag === normalizedPattern ||
          normalizedTag.includes(normalizedPattern)
        ) {
          return category as ExpertiseCategory;
        }
      } else {
        if (pattern.test(tag)) {
          pattern.lastIndex = 0; // Reset for global patterns
          return category as ExpertiseCategory;
        }
      }
    }
  }

  return null;
}

/**
 * Gets all relevant categories for a summary.
 * @param summary - The contributor's summary
 * @returns Array of categories that match the summary
 */
export function extractCategoriesFromSummary(
  summary: string | null | undefined
): ExpertiseCategory[] {
  if (!summary) return [];

  const foundCategories = new Set<ExpertiseCategory>();
  const tags = extractExpertiseTags(summary, 20);

  for (const tag of tags) {
    const category = mapTagToCategory(tag);
    if (category) {
      foundCategories.add(category);
    }
  }

  // Also check for direct category mentions in summary
  const summaryLower = summary.toLowerCase();
  for (const category of EXPERTISE_CATEGORIES) {
    if (summaryLower.includes(category.toLowerCase())) {
      foundCategories.add(category);
    }
  }

  return Array.from(foundCategories);
}

/**
 * Gets all available expertise categories from multiple summaries.
 * Returns only categories that actually appear in the data.
 * @param summaries - Array of summary texts
 * @returns Array of unique categories sorted by frequency
 */
export function extractAvailableCategories(
  summaries: (string | null | undefined)[]
): ExpertiseCategory[] {
  const categoryCounts = new Map<ExpertiseCategory, number>();

  for (const summary of summaries) {
    if (!summary) continue;

    const categories = extractCategoriesFromSummary(summary);
    for (const category of categories) {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }
  }

  // Sort by frequency (descending) and return only categories that appear
  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)
    .slice(0, 10); // Ensure max 10 categories
}

/**
 * Extracts all unique expertise tags from multiple summaries.
 * Useful for building filter options.
 * @param summaries - Array of summary texts
 * @returns Array of unique expertise tags sorted by frequency
 * @deprecated Use extractAvailableCategories instead for generic filtering
 */
export function extractAllExpertiseTags(
  summaries: (string | null | undefined)[]
): string[] {
  const tagCounts = new Map<string, number>();

  for (const summary of summaries) {
    if (!summary) continue;

    const tags = extractExpertiseTags(summary, 20); // Get more tags for aggregation
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Sort by frequency (descending)
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

/**
 * Checks if a contributor's summary contains a specific expertise tag.
 * @param summary - The contributor's summary
 * @param tag - The expertise tag to check for
 * @returns True if the summary contains the tag
 */
export function hasExpertise(
  summary: string | null | undefined,
  tag: string
): boolean {
  if (!summary) return false;

  const pattern = EXPERTISE_PATTERNS.find((p) => p.tag === tag);
  if (!pattern) {
    // Fallback to case-insensitive search
    return summary.toLowerCase().includes(tag.toLowerCase());
  }

  const result = pattern.pattern.test(summary);
  pattern.pattern.lastIndex = 0; // Reset for global patterns
  return result;
}

/**
 * Checks if a contributor's summary matches a specific category.
 * @param summary - The contributor's summary
 * @param category - The expertise category to check for
 * @returns True if the summary matches the category
 */
export function hasCategory(
  summary: string | null | undefined,
  category: ExpertiseCategory
): boolean {
  if (!summary) return false;

  const categories = extractCategoriesFromSummary(summary);
  return categories.includes(category);
}

/**
 * Filters contributors by expertise tags.
 * @param contributors - Array of contributors with summaries
 * @param tags - Array of tags to filter by (OR logic)
 * @returns Filtered array of contributors
 */
export function filterByExpertise<T extends { summary?: string | null }>(
  contributors: T[],
  tags: string[]
): T[] {
  if (tags.length === 0) return contributors;

  return contributors.filter((contributor) =>
    tags.some((tag) => hasExpertise(contributor.summary, tag))
  );
}

/**
 * Filters contributors by expertise categories.
 * @param contributors - Array of contributors with summaries
 * @param categories - Array of categories to filter by (OR logic)
 * @returns Filtered array of contributors
 */
export function filterByCategory<T extends { summary?: string | null }>(
  contributors: T[],
  categories: ExpertiseCategory[]
): T[] {
  if (categories.length === 0) return contributors;

  return contributors.filter((contributor) =>
    categories.some((category) => hasCategory(contributor.summary, category))
  );
}
