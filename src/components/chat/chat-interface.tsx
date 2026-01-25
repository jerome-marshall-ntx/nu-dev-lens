"use client";

import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";
import { ChatSuggestions } from "./suggestions";
import type { ChatStatus, UIMessage } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

interface ChatInterfaceProps {
  messages: UIMessage[];
  status: ChatStatus;
  onSendMessage: (text: string) => void;
}

export function ChatInterface({
  messages,
  status,
  onSendMessage,
}: ChatInterfaceProps) {
  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  const handleInputSubmit = (message: PromptInputMessage) => {
    onSendMessage(message.text || "Sent with attachments");
  };

  return (
    <div className="relative flex size-full flex-col divide-y overflow-hidden">
      <MessageList messages={messages} />
      <div className="grid shrink-0 gap-4 pt-4">
        <ChatSuggestions onSuggestionClick={handleSuggestionClick} />
        <ChatInput status={status} onSubmit={handleInputSubmit} />
      </div>
    </div>
  );
}
