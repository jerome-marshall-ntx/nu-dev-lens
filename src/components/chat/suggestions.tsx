"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const SUGGESTIONS = [
  "Who has the most experience with telemetry?",
  "Find engineers who worked on React Components",
  "Who knows the IAM UI codebase best?",
  "Which engineers have contributed to Flow UI?",
  "Who can help with Prism UI authentication?",
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
