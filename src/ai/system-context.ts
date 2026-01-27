import type { searchContributorsByQuery } from "@/use-cases/contributor";
import type { searchRepositoryWorksByQuery } from "@/use-cases/repository-work";
import type { UIMessage } from "ai";
import { messageToString } from "./utils";

interface Context {
  type: 'contributors' | 'repository-works';
  query: string;
  results: string[];
}

export class SystemContext {
  private step = 0;
  private readonly messages: UIMessage[];
  private context: Context[] = [];
  private lastFeedback?: string;

  constructor(messages: UIMessage[]) {
    this.messages = messages;
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role === "user" ? "User" : "Assistant";
        return `<${role}>${messageToString(message)}</${role}>`;
      })
      .join("\n\n");
  }

  shouldStop() {
    return this.step >= 4;
  }

  incrementStep() {
    this.step++;
  }

  getStep() {
    return this.step;
  }

  addContext(context: Context) {
    this.context.push(context);
  }

  addContributorsContext(query: string, contributors: Awaited<ReturnType<typeof searchContributorsByQuery>>) {
    this.addContext({
      type: 'contributors',
      query,
      results: contributors.map((c) => `- username: ${c.username}, url: ${c.url}, avatarUrl: ${c.avatarUrl}, summary: ${c.summary ?? 'No summary available'}`),
    });
  }

  addRepositoryWorksContext(query: string, repositoryWorks: Awaited<ReturnType<typeof searchRepositoryWorksByQuery>>) {
    this.addContext({
      type: 'repository-works',
      query,
      results: repositoryWorks.map((r) => `
- repository: ${r.repository.name}
- url: ${r.repository.url}
- work summary: ${r.summary ?? 'No summary available'}
- contributor summary: ${r.contributor.summary ?? 'No summary available'}
- contributor url: ${r.contributor.url}
- contributor username: ${r.contributor.username}`),
    });
  }

  getContext() {
    return this.context.map((c) => {
      const type = c.type === 'contributors' ? 'Contributors' : 'Repository Works';

      return `## ${type} - Search results
      - Query: ${c.query}
      - Results: ${c.results.map((r) => `- ${r}`).join("\n")}
      `;
    }).join("\n\n");
  }

  setLastFeedback(feedback: string) {
    this.lastFeedback = feedback;
  }

  getLastFeedback() {
    return this.lastFeedback;
  }
}