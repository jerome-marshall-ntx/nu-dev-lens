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
  SEARCH_COMMITS: "search-commits",
  GET_TOP_CONTRIBUTORS: "get-top-contributors",
  GET_CONTRIBUTOR_STATS: "get-contributor-stats",
  LIST_REPOSITORIES: "list-repositories",
  ANALYZE_BUG_OR_ERROR: "analyze-bug-or-error",
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
        "search-commits",
        "get-top-contributors",
        "get-contributor-stats",
        "list-repositories",
        "analyze-bug-or-error",
      ])
    )
    .describe("Which tool(s) to use to answer this question. Can select multiple."),
  repositoryName: z
    .string()
    .optional()
    .describe(
      "ONLY for get-top-contributors tool. The EXACT repository name from the available list. Leave empty/omit if not using get-top-contributors."
    ),
  username: z
    .string()
    .optional()
    .describe(
      "ONLY for get-contributor-stats tool. A GitHub username (e.g., 'john-doe'). Leave empty/omit if not using get-contributor-stats."
    ),
  bugErrorContent: z
    .string()
    .optional()
    .describe(
      "REQUIRED for analyze-bug-or-error tool. Copy the ENTIRE user message containing the error/issue - include ALL text: error messages, stack traces, component names, bug descriptions, everything the user pasted. This is the raw input that will be used for semantic search."
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

3. "search-commits" (Semantic Search)
   - Find specific commits by their content, message, or changes
   - Use for: "find commits about database optimization", "recent changes to authentication", "commits related to performance"
   - Returns: relevant commits with author info, repository, date, and commit URL
   - IMPORTANT: Use this tool when answering expertise questions to provide commit references as proof of expertise
   - Combine with search-contributors to show BOTH who the expert is AND their recent relevant commits

5. "get-top-contributors" (Database Query - Quantitative)
   - Get contributors RANKED BY COMMIT COUNT for a specific repository
   - Use for: "who has the most commits?", "most experienced in repo X?", "top contributors to Flow UI?"
   - REQUIRES: repositoryName parameter
   - Returns: list of contributors with commit counts, sorted by most commits

6. "get-contributor-stats" (Database Query - Quantitative)
   - Get detailed stats for a SPECIFIC person
   - Use for: "how many commits does John have?", "what repos has Jane worked on?"
   - REQUIRES: username parameter
   - Returns: commit count, repository count for that person

7. "list-repositories" (Database Query)
   - List all available repositories
   - Use when: user asks about available repos, or you need to clarify which repo they mean
   - Returns: repository names with descriptions

8. "analyze-bug-or-error" (Bug/Error Analysis - HIGHEST PRIORITY)
   - Analyze bugs, errors, issues, or any problem to find related commits and people to contact
   - Use when: user reports a bug, error, issue, problem, or asks "who can help fix this?"
   - REQUIRES: bugErrorContent parameter (extract the FULL issue content from user's message)
   - Returns: relevant commits that might have caused/fixed similar issues + recommended people to contact
   - DETECTION PATTERNS - Use this tool when you see ANY of these:
     * JIRA ticket IDs (e.g., DIAL-12345, ENG-1234, or any PROJECT-NUMBER format)
     * Error messages or exception text
     * Stack traces with file paths and line numbers
     * Component names with error descriptions
     * Bug reports or issue descriptions
     * Keywords like: "Error:", "Exception:", "Failed:", "Timeout:", "Crash:", "bug", "broken", "not working", "issue"
     * User describing something that's not working correctly
     * User asking for help debugging or fixing something
     * Pasted content that looks like a bug report or error log
   - This tool should be used ALONE - it already performs comprehensive analysis

DECISION RULES - BUGS/ERRORS TAKE PRIORITY:

**FIRST: Check for bugs, errors, or issues**
If the user's message contains bug reports, error messages, stack traces, issue descriptions, or anything that indicates a problem:
→ Use ONLY "analyze-bug-or-error" tool
→ Extract the FULL issue content into the bugErrorContent parameter
→ Do NOT combine with other tools - this tool provides comprehensive analysis

**OTHERWISE: Use multiple tools for comprehensive answers**
The best answers come from combining multiple data sources. ALWAYS use 2+ tools when possible to provide richer, more complete context.

CRITICAL - "EXPERT" QUERIES REQUIRE COMMIT DATA:
When users ask for an "expert", "best developer", "most experienced", or "who knows X best" for a SPECIFIC REPOSITORY/PRODUCT:
- COMMIT COUNT is the PRIMARY indicator of expertise - someone with 500 commits knows more than someone with 10
- You MUST use get-top-contributors to get the commit ranking data
- Combine with search-repository-works to understand WHAT they worked on
- This gives you BOTH the quantitative proof (commits) AND qualitative context (what they did)

Example: "Who is the IAM UI expert?" or "Find me a developer expert in IAM"
→ MUST use: get-top-contributors (for IAM repo) + search-repository-works
→ The person with the most commits to that repo is likely the expert!

RECOMMENDED TOOL COMBINATIONS:

1. "Expert in [product/repo]" questions → ALWAYS use get-top-contributors + search + commits:
   - get-top-contributors (commit count = proof of expertise) + search-repository-works (what they worked on) + search-commits (recent relevant commits as proof)
   - Commit count is the STRONGEST signal of expertise in a specific codebase
   - Example: "IAM expert" → get-top-contributors for IAM repo + search-repository-works for context + search-commits for recent commits

2. Repository questions → Use BOTH quantitative + qualitative + commits:
   - get-top-contributors (who has most commits) + search-repository-works (what they actually worked on) + search-commits (specific commit references)
   - This gives the ranking, the context of their contributions, AND links to actual commits

3. General expertise questions (no specific repo) → Use ALL search tools:
   - search-contributors (overall expertise) + search-repository-works (specific work examples) + search-commits (commit references)
   - This shows their general skills, concrete examples, AND actual commit proof

4. Person-specific questions → Combine stats + context + commits:
   - get-contributor-stats (numbers) + search-contributors (expertise summary) + search-commits (recent relevant commits)
   - This gives quantitative data, qualitative insights, AND commit references

5. "Top contributor" or "most experienced" questions → ALWAYS use multiple:
   - get-top-contributors (commit ranking) + search-repository-works (what they did) + search-commits (recent commits)
   - Numbers alone don't tell the full story - always add context and commit links

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

3. bugErrorContent (for analyze-bug-or-error):
   - Extract the FULL issue content from the user's message
   - Include: error messages, stack traces, component names, issue descriptions, bug details
   - Preserve the original formatting and details
   - This helps find semantically similar commits and experts

IMPORTANT - TOOL SELECTION PRIORITY:
1. Bugs/errors/issues → Use analyze-bug-or-error ALONE (it's comprehensive)
2. Expert/repo questions → Use 2+ tools for complete answers
3. Simple factual queries → Single tool is acceptable
- ALWAYS set bugErrorContent when using analyze-bug-or-error
- ALWAYS set repositoryName when using get-top-contributors
- ALWAYS set username when using get-contributor-stats
`,
    prompt: `Message History:
${messageHistory}

Based on the conversation, select which tool(s) to use and extract any parameters needed.

OUTPUT FORMAT - You MUST return a JSON object with these fields:
{
  "tools": ["tool-name-here"],  // REQUIRED: array of tool names
  "repositoryName": "...",  // ONLY if using get-top-contributors, otherwise OMIT this field
  "username": "...",  // ONLY if using get-contributor-stats, otherwise OMIT this field
  "bugErrorContent": "...",  // ONLY if using analyze-bug-or-error - copy FULL user message here
  "reasoning": "..."  // REQUIRED: why you chose these tools
}

CRITICAL FOR analyze-bug-or-error:
- You MUST set bugErrorContent to the COMPLETE text from the user's message
- Copy EVERYTHING: error messages, stack traces, file paths, descriptions, bug details
- Do NOT summarize - paste the raw content
- Do NOT set username or repositoryName when using analyze-bug-or-error

EXAMPLE for bug, error, or issue (HIGHEST PRIORITY - detect these first!):

User message: "DIAL-12345: Authentication timeout in IAM module

Error: Connection timeout after 30s
Stack trace:
  at AuthService.validateToken (auth-service.ts:142)
  at SessionManager.refresh (session.ts:89)

Component: iam-ui/services/authz"

Response:
{
  "tools": ["analyze-bug-or-error"],
  "bugErrorContent": "DIAL-12345: Authentication timeout in IAM module\n\nError: Connection timeout after 30s\nStack trace:\n  at AuthService.validateToken (auth-service.ts:142)\n  at SessionManager.refresh (session.ts:89)\n\nComponent: iam-ui/services/authz",
  "reasoning": "User pasted a bug report with error details and stack trace. Using analyze-bug-or-error to find related commits and experts."
}

EXAMPLE for generic bug description:

User message: "The login page keeps crashing when users try to reset their password. It happens in the IAM UI."

Response:
{
  "tools": ["analyze-bug-or-error"],
  "bugErrorContent": "The login page keeps crashing when users try to reset their password. It happens in the IAM UI.",
  "reasoning": "User is describing a bug/crash in the login functionality. Using analyze-bug-or-error to find related commits and experts who can help."
}

EXAMPLE for "Who is the IAM expert?" or "Find a developer expert in IAM UI":
{
  "tools": ["get-top-contributors", "search-repository-works", "search-commits"],
  "repositoryName": "jerome-marshall-ntx/iam-ui",
  "reasoning": "For 'expert' queries, commit count is the primary indicator of expertise. Using get-top-contributors to find who has the most commits (= most experienced), search-repository-works to understand what they worked on, AND search-commits to provide recent commit references as proof of expertise."
}

EXAMPLE for "Who is the top contributor to IAM?":
{
  "tools": ["get-top-contributors", "search-repository-works", "search-commits"],
  "repositoryName": "jerome-marshall-ntx/iam-ui",
  "reasoning": "Using get-top-contributors to find who has the most commits, search-repository-works to understand what they actually worked on, AND search-commits to provide links to their recent relevant commits."
}

EXAMPLE for "Who knows React?" (general skill, no specific repo):
{
  "tools": ["search-contributors", "search-repository-works", "search-commits"],
  "reasoning": "Using search-contributors to find people with React expertise, search-repository-works to find specific examples of React work they've done, AND search-commits to show their recent React-related commits as proof."
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

  // Check if this is a bug/error analysis
  const isBugErrorAnalysis = searchResults.includes("Bug/Error Analysis");

  const result = streamText({
    model: chatModel,
    system: isBugErrorAnalysis
      ? `
You are NuDevLens, an AI assistant that helps analyze bugs and errors to find the right people to contact for resolution.

BUG/ERROR ANALYSIS RESPONSE FORMAT:

When analyzing a bug or error, structure your response in these sections:

1. **Issue Summary** (1-2 sentences)
   - Briefly summarize what the issue is about based on the user's input

2. **Potentially Related Commits** (show top 2-3)
   - For each commit, show:
     - Commit message (first line)
     - Author: <contributor id="id">username</contributor>
     - Repository and date
     - Why it might be related (based on similarity and content)
   - Use a table format if showing multiple commits

3. **Recommended Contacts** (prioritized list)
   
   **Primary Contact (Most Likely to Help):**
   - <contributor id="id">username</contributor>
   - Reason: [Why they are the best person to contact - based on their related commits or domain expertise]
   
   **Additional Contacts:**
   - List 1-2 more people who could help, with brief reasons

4. **Summary**
   - One sentence recommendation on who to reach out to first

FORMATTING RULES:
- Use the contributor tag format: <contributor id="id">username</contributor>
- Be concise - focus on actionable information
- Prioritize commit authors (they made related changes) over domain experts
- If similarity scores are low (<50%), mention that matches are approximate
- Don't invent information not in the search results
`
      : `
You are NuDevLens, an AI assistant that helps people find engineering experts within their organization based on GitHub activity.

RESPONSE RULES:
- Be clear and concise - no verbose explanations
- Show maximum 3-4 contributors, prioritize the best matches
- Lead with the top recommendation as your "best point of contact"
- Don't mention contacting via Slack, email, or other channels - just identify who to reach out to
- At the end, suggest one person to reach out to based on the search results that is the best match.
- IMPORTANT: When commit data is available, include recent relevant commits as proof of expertise

FORMATTING:
- For multiple contributors, use a table with these columns:
  | Contributor | Expertise | Relevance | Recent Commits |
  - Contributor: <contributor id="id">username</contributor>
  - Expertise: Group skills by category using bullet points, e.g.:
    • *Frontend*: React, TypeScript, **CSS**
    • *Backend*: Node.js, **Python**
    • *Infrastructure*: Docker, Kubernetes
    Use **bold** to highlight skills that are most relevant to the user's query
  - Relevance: Bullet points explaining why they match (1-2 bullets max)
  - Recent Commits: Show 1-2 most relevant commits as markdown links. IMPORTANT: Each commit link must be on its own line with a bullet point prefix. Use the format:
    • [commit summary](url)
    • [commit summary](url)
    Do NOT combine multiple commits on the same line. Each bullet + commit should be a separate line.
- For a single top match, use the same format but highlight them as the best point of contact
- Keep responses short and actionable

COMMIT REFERENCES:
- When commits are available in the search results, include them as proof of expertise
- Show the commit summary and link to the actual commit
- Format each commit on its own line: • [Brief commit description](commit_url)
- NEVER put multiple commits on the same line separated only by a space or comma
- This gives users concrete evidence of the contributor's work

LIMITATIONS:
- Only show what's in the search results - don't invent expertise
- If matches are partial or weak, say so briefly
`,
    prompt: `Message History:
${messageHistory}

Search Results:
${searchResults || "No results found."}

${isBugErrorAnalysis ? "Analyze the bug/error and provide recommendations on who to contact to help resolve it." : "Help the user find who they're looking for based on the search results above."}`,
  });

  return result;
};