import { generateText, Output, streamText } from "ai";
import z from "zod";
import { chatModel } from "./models";
import type { SystemContext } from "./system-context";

/**
 * Determines what type of search the user needs (contributors or repository works)
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