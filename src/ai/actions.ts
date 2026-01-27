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
1. "contributors" - When the user wants to find people/developers based on their skills, experience, or contributions
2. "repository-works" - When the user wants to find code, projects, or technical work based on features or functionality

CLASSIFICATION RULES:
- Look for people-related keywords: "who", "developer", "engineer", "person", "team member", "expert in"
- Look for code-related keywords: "code", "project", "repository", "implementation", "feature", "how is X built"
- If ambiguous, consider the user's likely intent based on what would be most helpful
    `,
    prompt: `Message History:
${messageHistory}

Based on the conversation above, classify what type of search the user needs.`,
  });

  return result.output;
};

/**
 * Generates the search query based on what the user is looking for
 */
export const generateSearchQuery = async (
  ctx: SystemContext,
  searchType: "contributors" | "repository-works"
) => {
  const messageHistory = ctx.getMessageHistory();
  const lastFeedback = ctx.getLastFeedback();

  const typeDescription =
    searchType === "contributors"
      ? "people/developers based on their skills and experience"
      : "code, projects, or technical implementations";

  const searchTargetDescription =
    searchType === "contributors"
      ? "AI-generated contributor profiles that summarize each engineer's expertise, skills, and areas of work across repositories"
      : "AI-generated summaries of code contributions, features implemented, and technical work done in repositories";

  const result = await generateText({
    model: chatModel,
    system: `
You are a semantic search query optimizer. Your task is to create queries optimized for semantic similarity matching against ${searchTargetDescription}.

SEMANTIC SEARCH OPTIMIZATION RULES:
- Write the query as a natural language description of what you're looking for
- Use descriptive phrases rather than keyword lists (semantic search matches meaning, not exact words)
- Include relevant synonyms and related concepts to broaden semantic matching
- Describe the expertise, skills, or work patterns you want to find
- Frame the query to match how contributor profiles or work summaries would be written
- Avoid question formats - use declarative descriptions instead

EXAMPLES:
- Instead of: "React performance expert"
- Use: "developer experienced with React performance optimization, component rendering, and frontend speed improvements"

- Instead of: "database work"
- Use: "work involving database design, SQL optimization, data modeling, and backend data layer improvements"
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