import { generateText, Output, streamText } from "ai";
import z from "zod";
import { chatModel } from "./models";
import type { SystemContext } from "./system-context";

// ============================================================================
// TOOL TYPES - Used for tool selection
// ============================================================================

/**
 * Available tools that can be selected by the AI
 */
export const ToolType = {
  SEARCH_CONTRIBUTORS: "search-contributors",
  SEARCH_REPOSITORY_WORKS: "search-repository-works",
  GET_TOP_CONTRIBUTORS: "get-top-contributors",
  GET_CONTRIBUTOR_STATS: "get-contributor-stats",
  LIST_REPOSITORIES: "list-repositories",
} as const;

export type ToolType = (typeof ToolType)[keyof typeof ToolType];

/**
 * Schema for tool selection output
 */
const toolSelectionSchema = z.object({
  tools: z
    .array(
      z.enum([
        "search-contributors",
        "search-repository-works",
        "get-top-contributors",
        "get-contributor-stats",
        "list-repositories",
      ])
    )
    .describe("Which tool(s) to use to answer this question. Can select multiple."),
  repositoryName: z
    .string()
    .describe(
      "The EXACT repository name from the available repositories list. Required when using get-top-contributors. Map user's query to the matching repo name (e.g., if user says 'IAM', find the repo with 'iam' in its name from the list)."
    ),
  username: z
    .string()
    .describe(
      "A GitHub username of a person (e.g., 'john-doe', 'jane-smith'). Required for get-contributor-stats tool. This is a PERSON's username, NOT a repository name."
    ),
  reasoning: z.string().describe("Brief explanation of why these tools were selected"),
});

export type ToolSelection = z.infer<typeof toolSelectionSchema>;

/**
 * Selects which tool(s) to use based on the user's query.
 * This replaces the simpler getSearchType function with more options.
 */
export const selectTools = async (
  ctx: SystemContext,
  repositoryDescriptions: { name: string; description: string | null }[]
): Promise<ToolSelection> => {
  const messageHistory = ctx.getMessageHistory();
  const repoNames = repositoryDescriptions.map((r) => r.name).join(", ");

  const result = await generateText({
    model: chatModel,
    output: Output.object({
      schema: toolSelectionSchema,
    }),
    system: `
You are a tool selector for NuDevLens, a developer expertise discovery platform. Your task is to analyze user requests and decide which tool(s) to use.

AVAILABLE TOOLS:

1. "search-contributors" (Semantic Search)
   - Find people by skills, expertise, or experience across ALL repositories
   - Use for: "who knows React?", "find a security expert", "who has experience with testing?"
   - Returns: contributor profiles with AI-generated summaries of their expertise

2. "search-repository-works" (Semantic Search)
   - Find what contributors worked on in SPECIFIC repositories
   - Use for: "who worked on the login feature?", "find contributors to Flow UI security"
   - Returns: work summaries showing what each person did in a specific repo

3. "get-top-contributors" (Database Query - Quantitative)
   - Get contributors RANKED BY COMMIT COUNT for a specific repository
   - Use for: "who has the most commits?", "most experienced in repo X?", "top contributors to Flow UI?"
   - REQUIRES: repositoryName parameter
   - Returns: list of contributors with commit counts, sorted by most commits

4. "get-contributor-stats" (Database Query - Quantitative)
   - Get detailed stats for a SPECIFIC person
   - Use for: "how many commits does John have?", "what repos has Jane worked on?"
   - REQUIRES: username parameter
   - Returns: commit count, repository count for that person

5. "list-repositories" (Database Query)
   - List all available repositories
   - Use when: user asks about available repos, or you need to clarify which repo they mean
   - Returns: repository names with descriptions

DECISION RULES - ALWAYS PREFER MULTIPLE TOOLS:

The best answers come from combining multiple data sources. ALWAYS use 2+ tools when possible to provide richer, more complete context.

RECOMMENDED TOOL COMBINATIONS:

1. Repository questions → Use BOTH quantitative + qualitative:
   - get-top-contributors (who has most commits) + search-repository-works (what they actually worked on)
   - This gives both the ranking AND the context of their contributions

2. Expertise questions → Use BOTH search tools:
   - search-contributors (overall expertise) + search-repository-works (specific work examples)
   - This shows both their general skills AND concrete examples

3. Person-specific questions → Combine stats + context:
   - get-contributor-stats (numbers) + search-contributors (expertise summary)
   - This gives both quantitative data AND qualitative insights

4. "Top contributor" or "most experienced" questions → ALWAYS use multiple:
   - get-top-contributors (commit ranking) + search-repository-works (what they did)
   - Numbers alone don't tell the full story - always add context

SINGLE TOOL is only acceptable for:
- "list-repositories" when user just wants to see available repos
- Very simple factual queries like "how many commits does X have?" (just get-contributor-stats)

- When a SPECIFIC REPOSITORY is mentioned:
  → Extract the repository name and set repositoryName parameter
  → Use get-top-contributors AND search-repository-works for complete picture

- When a SPECIFIC PERSON is mentioned:
  → Extract the username and set username parameter
  → Use get-contributor-stats AND search-contributors for full context

AVAILABLE REPOSITORIES (use EXACTLY these names for repositoryName parameter):
${repoNames}

PARAMETER EXTRACTION - CRITICAL:

1. repositoryName (for get-top-contributors):
   - MUST be one of the exact repository names listed above
   - Map user's informal names to the exact repository name:
     * "IAM" or "iam" → look for a repo containing "iam" in the list above
     * "Flow" or "flow" → look for a repo containing "flow" in the list above  
     * "DRaaS" or "disaster recovery" → look for a repo containing "draas" in the list above
   - Set this field when using get-top-contributors tool

2. username (for get-contributor-stats):
   - A GitHub username of a PERSON (e.g., "john-doe", "jane-smith")
   - This is NOT a repository name - it's a person's GitHub account name
   - Set this field when using get-contributor-stats tool

IMPORTANT - MULTI-TOOL APPROACH:
- DEFAULT to selecting 2+ tools for comprehensive answers
- Single tool responses are the EXCEPTION, not the rule
- More context = better answers for the user
- ALWAYS set repositoryName when using get-top-contributors
- ALWAYS set username when using get-contributor-stats
`,
    prompt: `Message History:
${messageHistory}

Based on the conversation, select which tool(s) to use and extract any parameters needed.

OUTPUT FORMAT - You MUST return a JSON object with these fields:
{
  "tools": ["tool-name-here"],  // REQUIRED: array of tool names
  "repositoryName": "exact-repo-name",  // optional: set when using get-top-contributors
  "username": "github-username",  // optional: set when using get-contributor-stats  
  "reasoning": "Brief explanation"  // REQUIRED: why you chose these tools
}

EXAMPLE for "Who is the top contributor to IAM?":
{
  "tools": ["get-top-contributors", "search-repository-works"],
  "repositoryName": "jerome-marshall-ntx/iam-ui",
  "reasoning": "Using get-top-contributors to find who has the most commits, AND search-repository-works to understand what they actually worked on. This gives both the ranking and meaningful context about their contributions."
}

EXAMPLE for "Who knows React?":
{
  "tools": ["search-contributors", "search-repository-works"],
  "reasoning": "Using search-contributors to find people with React expertise, AND search-repository-works to find specific examples of React work they've done. This provides both general expertise and concrete evidence."
}`,
  });

  return result.output;
};

/**
 * Determines what type of search the user needs (contributors or repository works)
 * @deprecated Use selectTools instead for more flexible tool selection
 */
export const getSearchType = async (ctx: SystemContext) => {
  const messageHistory = ctx.getMessageHistory();

  const result = await generateText({
    model: chatModel,
    output: Output.object({
      schema: z.object({
        type: z.enum(['contributors', 'repository-works']).describe('The type of search the user needs.'),
        reasoning: z.string().describe('The reasoning for the classification.'),
      }),
    }),
    system: `
You are a search classifier for a developer tools platform. Your task is to analyze user requests and determine what type of search they need.

SEARCH TYPES:
1. "contributors" - When the user wants to find people/developers based on their overall skills, experience, or expertise across all repositories
2. "repository-works" - When the user wants to find what a specific contributor worked on in a specific repository, or find contributors who worked on particular features/areas within specific repos

CLASSIFICATION RULES:
- Use "contributors" when: looking for experts by skill, finding people with certain experience, general "who knows X?" questions
- Use "repository-works" when: asking about work in a specific repo, finding who contributed to a particular feature area, or when repo-specific context matters
- If ambiguous, prefer "contributors" for general expertise questions, "repository-works" for feature/repo-specific questions
    `,
    prompt: `Message History:
${messageHistory}

Based on the conversation above, classify what type of search the user needs.`,
  });

  return result.output;
};

/**
 * Formats repository descriptions for inclusion in prompts.
 */
function formatRepositoryContext(
  repos: { name: string; description: string | null }[]
): string {
  return repos
    .filter((r) => r.description)
    .map((r) => `- ${r.name}: ${r.description}`)
    .join("\n\n");
}

/**
 * Generates the search query based on what the user is looking for
 */
export const generateSearchQuery = async (
  ctx: SystemContext,
  searchType: "contributors" | "repository-works",
  repositoryDescriptions: { name: string; description: string | null }[]
) => {
  const messageHistory = ctx.getMessageHistory();
  const lastFeedback = ctx.getLastFeedback();
  const repositoryContext = formatRepositoryContext(repositoryDescriptions);

  const typeDescription =
    searchType === "contributors"
      ? "people/developers based on their overall skills and experience across all repositories"
      : "contributor work summaries within specific repositories (what each person worked on in a particular repo)";

  const searchTargetDescription =
    searchType === "contributors"
      ? "AI-generated contributor profiles that summarize each engineer's expertise, skills, and areas of work across all repositories"
      : "AI-generated summaries of what each contributor worked on in a specific repository, including their focus areas and contributions within that repo";

  const result = await generateText({
    model: chatModel,
    system: `
You are a semantic search query optimizer. Your task is to create queries optimized for semantic similarity matching against ${searchTargetDescription}.

NUTANIX DOMAIN CONTEXT:
You are searching within Nutanix engineering work. Nutanix is a hybrid multicloud computing company
that provides a unified software platform for running applications, AI, and managing data across
on-premises datacenters, edge locations, and public clouds. Their products include:
- Nutanix Cloud Infrastructure (NCI) - hyperconverged compute, storage, virtualization
- Nutanix Cloud Manager (NCM) - automation, self-service, orchestration
- Prism Central/Prism Element (PC/PE) - unified management interface
- Flow Network Security - microsegmentation and network security policies
- And various UI subapps that provide management interfaces for these capabilities

All search results represent work on PRODUCT FEATURES within Nutanix applications (Prism UI, Flow UI, etc.).

CRITICAL: When users mention terms like "load balancer", "security policies", "recovery plans" -
they are referring to PRODUCT FEATURES in Nutanix management UIs, NOT generic infrastructure concepts.
Do NOT expand these into generic terms like "nginx", "traffic distribution", "session affinity".

AVAILABLE PRODUCTS AND FEATURES:
${repositoryContext}

SEMANTIC SEARCH OPTIMIZATION RULES:
- Write the query as a natural language description of what you're looking for
- Use the exact feature names from the products above when relevant
- Frame queries to match how contributor summaries would describe work on these features
- Use descriptive phrases rather than keyword lists (semantic search matches meaning, not exact words)
- Describe the expertise, skills, or work patterns you want to find
- Avoid question formats - use declarative descriptions instead

EXAMPLES:
- Instead of: "load balancer" (generic)
- Use: "Load Balancer feature in Flow UI, network load balancer configuration UI components"

- Instead of: "recovery plans" (generic)
- Use: "Recovery Plan feature in DRaaS, disaster recovery configuration UI, failover workflows"

- Instead of: "React performance expert"
- Use: "developer experienced with React performance optimization, component rendering, and frontend speed improvements"
    `,
    prompt: `Message History:
${messageHistory}

${lastFeedback ? `\nLast feedback from evaluation:\n${lastFeedback}` : ""}

Create a semantic search query optimized to find ${typeDescription}.
Return ONLY the search query, nothing else.`,
  });

  return result.text;
};

/**
 * Decides whether to continue searching or answer based on gathered information
 */
export const decideNextAction = async (ctx: SystemContext) => {
  const messageHistory = ctx.getMessageHistory();
  const searchResults = ctx.getContext();

  const result = await generateText({
    model: chatModel,
    output: Output.object({
      schema: z.object({
        action: z.enum(['continue', 'answer']).describe('The next action to take.'),
        reasoning: z.string().describe('The reasoning for the next action.'),
      }),
    }),
    system: `
You are a research coordinator for NuDevLens, an AI-powered tool that helps find engineering experts by analyzing GitHub activity. Your task is to evaluate search results and decide whether to continue searching or provide an answer.

EVALUATION PROCESS:
1. What is the user actually trying to find? (a person with specific skills? work in a specific area?)
2. Do the search results contain profiles or work summaries that match this need?
3. Would a different search angle (different terminology, broader/narrower scope) yield better results?

DECISION CRITERIA:
- "answer": You have relevant contributor profiles or work summaries to share
- "answer": Results partially match - some useful information is better than none
- "continue": Results are off-target AND you have a clear idea for a better search approach

FEEDBACK FOR RETRYING (only when choosing "continue"):
Your feedback will be used to generate a new semantic search query. Be specific:
- What expertise or work type should the next query describe?
- What related terms, technologies, or concepts should be included?
- Should it search for contributors (people) or repository-works (code/projects)?
    `,
    prompt: `Message History:
${messageHistory}

Search Results So Far:
${searchResults || "No searches performed yet."}

Evaluate the search results against what the user is looking for.
Choose "continue" only if you have a specific strategy for a better search.
Choose "answer" if you have useful results to share, even if partial.`,
  });

  return result.output;
};

/**
 * Generates the final answer based on all gathered information
 */
export const generateAnswer = async (ctx: SystemContext) => {
  const messageHistory = ctx.getMessageHistory();
  const searchResults = ctx.getContext();

  const result = streamText({
    model: chatModel,
    system: `
You are NuDevLens, an AI assistant that helps people find engineering experts within their organization. You analyze GitHub activity to understand who has expertise in different areas.

RESPONSE GUIDELINES:
1. Lead with the answer - name the people or work that match what they're looking for
2. Explain WHY each result is relevant - what in their profile/work indicates this expertise?
3. Be specific - mention technologies, features, or areas of work from the summaries
4. Keep it actionable - the goal is to help the user find the right person to talk to

FORMATTING:
- Use bullet points when listing multiple contributors or projects
- Bold contributor names for easy scanning
- Keep explanations concise (1-2 sentences per result)

LIMITATIONS:
- If results are only partially relevant, say so and explain what was found
- If no good matches exist, be honest and suggest how to refine the search
- Don't invent expertise - only reference what's in the search results
    `,
    prompt: `Message History:
${messageHistory}

Search Results:
${searchResults || "No results found."}

Help the user find who they're looking for based on the search results above.`,
  });

  return result;
};