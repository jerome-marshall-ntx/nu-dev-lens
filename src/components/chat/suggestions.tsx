"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const SUGGESTIONS = [
  "Who has the most experience with disaster recovery features?",
  "Find engineers who worked on the security dashboard",
  "Who knows the IAM UI codebase best?",
  "Which engineers have contributed to Flow UI?",
  "Who can help with Prism UI authentication?",
  "Find experts in React components across our repos",
  "Who has worked on both DRaaS and security features?",
  "Show me top contributors to prism-ui-draas",
];

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function ChatSuggestions({ onSuggestionClick }: ChatSuggestionsProps) {
  return (
    <Suggestions className="px-4">
      {SUGGESTIONS.map((suggestion) => (
        <Suggestion
          key={suggestion}
          onClick={() => onSuggestionClick(suggestion)}
          suggestion={suggestion}
        />
      ))}
    </Suggestions>
  );
}
