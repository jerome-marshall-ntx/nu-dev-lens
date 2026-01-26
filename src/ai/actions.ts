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

  const result = await generateText({
    model: chatModel,
    system: `
You are a search query optimizer. Your task is to create effective search queries for finding ${typeDescription}.

QUERY OPTIMIZATION RULES:
- Extract the core intent from the user's request
- Focus on specific skills, technologies, or features mentioned
- Remove conversational filler words
- Keep queries concise but descriptive (3-10 words ideal)
- Use technical terms when the user mentions them
    `,
    prompt: `Message History:
${messageHistory}

${lastFeedback ? `\nLast feedback from evaluation:\n${lastFeedback}` : ""}


Create an optimized search query to find ${typeDescription}.
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
You are a research coordinator for a developer tools platform. Your task is to analyze search results against the user's original question and decide the next action.

PROCESS:
1. Identify what information the user is specifically asking for
2. Analyze what relevant information has been found in the search results
3. Identify any gaps between what was asked and what was found
4. Decide if more searching would help, or if you have enough to answer

DECISION CRITERIA:
- Use "answer" when you have enough relevant results to help the user
- Use "continue" when the results are missing key information AND more searching would likely help
- Use "answer" if you've already done multiple searches (avoid endless loops)

When providing feedback (only required when choosing "continue"):
- Be specific about what information is missing
- Explain what type of search would fill the gap
- Suggest whether to search for contributors or repository-works
    `,
    prompt: `Message History:
${messageHistory}

Search Results So Far:
${searchResults || "No searches performed yet."}

Based on this context, choose the next action:
1. If you need more information, respond with "continue" and explain what's missing.
2. If you have enough information to help the user, respond with "answer".

Remember:
- Only use "continue" if more searching would genuinely help
- Use "answer" when you have useful results to share
- Feedback is only required when choosing "continue"

Your decision:`,
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
You are a helpful assistant for a developer tools platform. Your task is to answer the user's question using the search results you've gathered.

RESPONSE GUIDELINES:
- Directly address what the user asked for
- Reference specific contributors or repository works from the search results
- Be concise but informative
- If the results don't fully answer the question, acknowledge limitations
- Format your response clearly (use bullet points for lists of people or projects)
    `,
    prompt: `Message History:
${messageHistory}

Search Results:
${searchResults || "No results found."}

Based on the search results above, provide a helpful answer to the user's question.`,
  });

  return result;
};