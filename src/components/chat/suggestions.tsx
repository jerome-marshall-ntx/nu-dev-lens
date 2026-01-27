"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const SUGGESTIONS = [
  "Who has the most experience with telemetry?",
  "Who can help with ARIA and accessibility compliance?",
  "Find engineers experienced with disaster recovery UI",
  "Who knows the IAM and RBAC interfaces best?",
  "Which engineers have CI/CD pipeline expertise?",
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
